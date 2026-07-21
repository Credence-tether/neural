"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import OpenAI from "openai";

// ── Provider helpers ──────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const apiKey =
    provider === "groq"
      ? (process.env.GROQ_API_KEY ?? "")
      : provider === "gemini"
      ? (process.env.GEMINI_API_KEY ?? "")
      : provider === "ollama"
      ? "ollama"
      : (process.env.OPENAI_API_KEY ?? "");

  const baseURL =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/openai/"
      : provider === "ollama"
      ? `${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/v1`
      : "https://api.openai.com/v1";

  return new OpenAI({ apiKey, baseURL });
}

function getModel(): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  const provider = process.env.AI_PROVIDER ?? "openai";
  if (provider === "groq") return "llama-3.3-70b-versatile";
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "ollama") return "llama3.2";
  return "gpt-4o-mini";
}

function getEmbedModel(): string {
  const provider = process.env.EMBED_PROVIDER ?? "openai";
  if (provider === "ollama") return "nomic-embed-text";
  if (provider === "gemini") return "gemini-embedding-001";
  return "text-embedding-3-small";
}

async function getEmbedding(text: string): Promise<number[]> {
  const provider = process.env.EMBED_PROVIDER ?? "openai";

  if (provider === "ollama") {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: getEmbedModel(), input: text }),
    });
    const data = (await res.json()) as { embeddings?: number[][] };
    return data.embeddings?.[0] ?? [];
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const model = getEmbedModel();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      }
    );
    const data = (await res.json()) as { embedding?: { values?: number[] }; error?: { message?: string; status?: string } };
    if (data.error) {
      console.error("[NeuralSupport] Gemini embedding error:", JSON.stringify(data.error));
      return [];
    }
    return data.embedding?.values ?? [];
  }

  // OpenAI (default)
  const openai = getOpenAIClient();
  const resp = await openai.embeddings.create({
    model: getEmbedModel(),
    input: text,
  });
  return resp.data[0]?.embedding ?? [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

function chunkText(text: string, maxChunkSize = 600): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChunkSize && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Crawl + Embed ─────────────────────────────────────────────────────────────

export const crawlAndEmbed = action({
  args: { siteUrl: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) {
      throw new ConvexError({ message: "FIRECRAWL_API_KEY secret not set", code: "BAD_REQUEST" });
    }

    const jobId = await ctx.runMutation(internal.aiHelpers.createCrawlJob, { siteUrl: args.siteUrl });

    try {
      const crawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({
          url: args.siteUrl,
          limit: 25,
          excludePaths: ["blog/*", "blog", "news/*", "news", "articles/*", "posts/*"],
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!crawlRes.ok) {
        throw new Error(`Firecrawl error: ${await crawlRes.text()}`);
      }

      const crawlData = (await crawlRes.json()) as { id?: string };
      if (!crawlData.id) throw new Error("No crawl ID returned");

      type FirecrawlPage = { markdown?: string; metadata?: { title?: string; sourceURL?: string } };
      let pages: FirecrawlPage[] = [];
      let attempts = 0;

      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlData.id}`, {
          headers: { Authorization: `Bearer ${firecrawlKey}` },
        });
        const statusData = (await statusRes.json()) as { status?: string; data?: FirecrawlPage[] };

        if (statusData.status === "completed") {
          pages = statusData.data ?? [];
          break;
        }
        if (statusData.status === "failed") throw new Error("Crawl failed");
        attempts++;
      }

      await ctx.runMutation(internal.aiHelpers.clearChunks, { siteUrl: args.siteUrl });

      let totalCrawled = 0;
      let chunksSaved = 0;
      let chunksFailed = 0;
      for (const page of pages) {
        if (!page.markdown) continue;
        const chunks = chunkText(page.markdown);
        for (let i = 0; i < chunks.length; i++) {
          // Respect Gemini free tier: 100 requests/min → wait 700ms between calls
          const provider = process.env.EMBED_PROVIDER ?? "openai";
          if (provider === "gemini") {
            await new Promise((res) => setTimeout(res, 700));
          }
          const embedding = await getEmbedding(chunks[i]);
          if (embedding.length === 0) {
            // Embedding call failed (bad key, quota, wrong model, etc.) —
            // never store a chunk with no vector, it's useless for search
            // and silently pollutes the knowledge base.
            chunksFailed++;
            continue;
          }
          await ctx.runMutation(internal.aiHelpers.insertChunk, {
            siteUrl: args.siteUrl,
            url: page.metadata?.sourceURL ?? args.siteUrl,
            title: page.metadata?.title,
            content: chunks[i],
            embedding,
            chunkIndex: i,
          });
          chunksSaved++;
        }
        totalCrawled++;
      }

      if (chunksSaved === 0 && chunksFailed > 0) {
        throw new Error(
          `All ${chunksFailed} chunk embeddings failed — check EMBED_PROVIDER credentials/model. No knowledge was saved.`
        );
      }

      await ctx.runMutation(internal.aiHelpers.completeCrawlJob, {
        jobId,
        pagesCrawled: totalCrawled,
      });
    } catch (err) {
      await ctx.runMutation(internal.aiHelpers.failCrawlJob, {
        jobId,
        error: String(err),
      });
      throw err;
    }
  },
});

// ── AI Chat response ──────────────────────────────────────────────────────────

export const generateAiReply = internalAction({
  args: {
    conversationId: v.id("conversations"),
    visitorMessage: v.string(),
    siteUrl: v.optional(v.string()),
    messageHistory: v.array(v.object({ role: v.string(), content: v.string() })),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const retryCount = args.retryCount ?? 0;
    const MAX_RETRIES = 3;

    try {
      // RAG: get relevant chunks
      let contextText = "";
      if (args.siteUrl) {
        const chunks = await ctx.runQuery(internal.aiHelpers.getChunksForSite, {
          siteUrl: args.siteUrl,
        });
        if (chunks.length > 0 && args.visitorMessage.length > 3) {
          const queryEmbedding = await getEmbedding(args.visitorMessage);
          const scored = queryEmbedding.length === 0
            ? []
            : chunks
                .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 4)
                .filter((c) => c.score > 0.4);

          if (scored.length > 0) {
            contextText = scored.map((c) => `[${c.title ?? c.url}]\n${c.content}`).join("\n\n---\n\n");
          }
        }
      }

      const noContextNote = contextText
        ? `## Knowledge Base Context\n\n${contextText}`
        : `## Knowledge Base Context\n\n(No relevant articles found from knowledge base.)

## About WolvCapital (always available)
WolvCapital is a U.S. regulated digital investment platform on BNB Smart Chain offering 8%–25% APY staking plans.
Plans: Pioneer (8% APY, 30 days), Horizon (15% APY, 60 days), Zenith (25% APY, 90 days).
WOLV token (BEP-20): 0xe0167279aef7bf4ad313d261da82e8366822270c
KYC compliant, FinCEN registered, PCI-DSS compliant.
Support email: support@mail.wolvcapital.com
Website: https://wolvcapital.com
Apply Rule 1: keep visitor engaged using the above info.`;

      const systemPrompt = `You are an elite, highly engaging live support and growth agent for our platform.
Your primary goals are to resolve customer issues, maintain visitor engagement, and maximize lead conversion.
Your responses are grounded in the context provided by the knowledge base below.
However, if the retrieved context does not contain the answer, you must NEVER shut down the conversation or leave the user hanging.

## Operational Rules

1. HANDLING MISSING KNOWLEDGE & ENGAGEMENT:
   If the knowledge base does not have the answer, do NOT say "I don't know."
   Instead, keep the visitor actively engaged to protect the lead.
   Pivot smoothly by exploring alternative options, asking clarifying questions,
   or highlighting relevant platform benefits and features while the backend processes the human handoff.

2. SILENT HUMAN HANDOFF TRIGGER:
   If a user explicitly requests a human agent, or if the knowledge base cannot resolve
   an advanced technical or billing issue, you MUST place the exact token [TRIGGER_HANDOFF]
   at the very beginning of your response (before any other text).

3. PERSISTENCE POST-HANDOFF:
   After including [TRIGGER_HANDOFF], you MUST continue replying and keep the conversation alive.
   Do NOT stop responding. Keep talking to the visitor — explain next steps, offer general help,
   or ask follow-up questions until a live agent explicitly intercepts the chat.

4. CONTEXT INTEGRATION:
   Seamlessly merge the retrieved knowledge base data with the ongoing chat history.
   Do not ask for information the user has already provided in this conversation.

5. CONVERSATIONAL STYLE:
   Frontload the most essential information in your first sentence.
   Keep responses concise, scannable, and highly encouraging to drive conversions.
   Use markdown only when it clearly improves readability (bullet lists, code snippets).

${noContextNote}`;

      type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...args.messageHistory.slice(-10).map((m) => ({
          role: (m.role === "visitor" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: args.visitorMessage },
      ];

      const openai = getOpenAIClient();
      const model = getModel();

      const completion = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.72,
      });

      let reply =
        completion.choices[0]?.message?.content ??
        "I'm sorry, I couldn't generate a response. Please try again.";

      const provider = process.env.AI_PROVIDER ?? "openai";

      // Detect handoff trigger and mark conversation for agent
      if (reply.startsWith("[TRIGGER_HANDOFF]")) {
        // Strip the token from the visible reply
        reply = reply.replace("[TRIGGER_HANDOFF]", "").trimStart();
        // Mark conversation as waiting for agent + send push notification
        await ctx.runMutation(internal.aiHelpers.markStruggling, {
          conversationId: args.conversationId,
        });
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendNotification, {
          title: "Human Agent Requested",
          body: "A visitor has asked to speak with a live agent.",
          urgency: "high",
        });
      }

      await ctx.runMutation(internal.aiHelpers.saveAiReply, {
        conversationId: args.conversationId,
        content: reply,
        provider: `${provider}/${model}`,
      });
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        await ctx.scheduler.runAfter(2000 * (retryCount + 1), internal.ai.generateAiReply, {
          ...args,
          retryCount: retryCount + 1,
        });
      } else {
        // AI is struggling — notify agent
        await ctx.runMutation(internal.aiHelpers.saveAiReply, {
          conversationId: args.conversationId,
          content:
            "I'm having trouble finding a complete answer to your question. I've flagged this for a human agent who will be with you shortly. Is there anything else I can help with in the meantime?",
          provider: "fallback",
        });

        await ctx.runMutation(internal.aiHelpers.markStruggling, {
          conversationId: args.conversationId,
        });

        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendNotification, {
          title: "Agent Needed",
          body: "AI is struggling with a visitor conversation. Immediate assistance required.",
          urgency: "high",
        });
      }
    }
  },
});