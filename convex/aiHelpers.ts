import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

export const createCrawlJob = internalMutation({
  args: { siteUrl: v.string() },
  handler: async (ctx, args): Promise<Id<"crawlJobs">> => {
    return ctx.db.insert("crawlJobs", {
      siteUrl: args.siteUrl,
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
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", args.siteUrl))
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
    await ctx.db.insert("knowledgeChunks", args);
  },
});

export const getChunksForSite = internalQuery({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", args.siteUrl))
      .take(100);
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
