import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { normalizeSiteUrl } from "./siteUrl";

export const createCrawlJob = internalMutation({
  args: { siteUrl: v.string() },
  handler: async (ctx, args): Promise<Id<"crawlJobs">> => {
    return ctx.db.insert("crawlJobs", {
      siteUrl: normalizeSiteUrl(args.siteUrl),
      status: "running",
      startedAt: new Date().toISOString(),
    });
  },
});

export const completeCrawlJob = internalMutation({
  args: {
    jobId: v.id("crawlJobs"),
    pagesCrawled: v.number(),
    totalChunks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      pagesCrawled: args.pagesCrawled,
      completedAt: new Date().toISOString(),
    });
  },
});

export const failCrawlJob = internalMutation({
  args: { jobId: v.id("crawlJobs"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: new Date().toISOString(),
    });
  },
});

export const clearChunks = internalMutation({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    const site = normalizeSiteUrl(args.siteUrl);
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", site))
      .take(500);
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
  },
});

export const insertChunk = internalMutation({
  args: {
    siteUrl: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    content: v.string(),
    embedding: v.array(v.number()),
    chunkIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("knowledgeChunks", {
      ...args,
      siteUrl: normalizeSiteUrl(args.siteUrl),
    });
  },
});

// One-off cleanup: run once via `npx convex run aiHelpers:cleanupEmptyEmbeddings '{}'`
// (add --prod if cleaning the production deployment) to delete any chunks that
// were saved before the embedding-failure fix, which have an empty embedding
// array and are useless for search.
export const cleanupEmptyEmbeddings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("knowledgeChunks").collect();
    let deleted = 0;
    for (const chunk of all) {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        await ctx.db.delete(chunk._id);
        deleted++;
      }
    }
    return { totalChecked: all.length, deleted };
  },
});

// Cheap existence check — reads at most 1 doc, avoids paying for an
// embedding API call when the site has no knowledge base at all.
export const hasChunksForSite = internalQuery({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    const first = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", normalizeSiteUrl(args.siteUrl)))
      .first();
    return first !== null;
  },
});

// Scores chunks INSIDE the query runtime and returns only the top 4
// matches WITHOUT their embedding vectors. Previously the action pulled
// all 100 chunks (embeddings included) across the wire — ~3.8 MB per
// visitor message. This returns a few KB instead.
export const searchChunks = internalQuery({
  args: { siteUrl: v.string(), queryEmbedding: v.array(v.number()) },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", normalizeSiteUrl(args.siteUrl)))
      .take(100);

    const qe = args.queryEmbedding;
    const scored = chunks
      .map((c) => {
        const e = c.embedding;
        if (!e || e.length !== qe.length) return { c, score: 0 };
        let dot = 0,
          na = 0,
          nb = 0;
        for (let i = 0; i < e.length; i++) {
          dot += qe[i] * e[i];
          na += qe[i] * qe[i];
          nb += e[i] * e[i];
        }
        return { c, score: dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .filter((x) => x.score > 0.25);

    return scored.map((x) => ({
      title: x.c.title,
      url: x.c.url,
      content: x.c.content,
      score: x.score,
    }));
  },
});

export const saveAiReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "ai",
      content: args.content,
      aiProvider: args.provider,
      timestamp: new Date().toISOString(),
    });
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: new Date().toISOString(),
    });
  },
});

export const markStruggling = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      aiStruggling: true,
      status: "waiting_agent",
    });
  },
});


// One-off: normalize siteUrl on already-stored chunks + crawl jobs so old
// data becomes findable. Run once after deploy:
//   npx convex run aiHelpers:normalizeExistingSiteUrls '{}' --prod
export const normalizeExistingSiteUrls = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0;
    const chunks = await ctx.db.query("knowledgeChunks").collect();
    for (const c of chunks) {
      const n = normalizeSiteUrl(c.siteUrl);
      if (n !== c.siteUrl) {
        await ctx.db.patch(c._id, { siteUrl: n });
        patched++;
      }
    }
    const jobs = await ctx.db.query("crawlJobs").collect();
    for (const j of jobs) {
      const n = normalizeSiteUrl(j.siteUrl);
      if (n !== j.siteUrl) {
        await ctx.db.patch(j._id, { siteUrl: n });
        patched++;
      }
    }
    return { patched };
  },
});
