import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getKnowledgeChunks = query({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    return ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", args.siteUrl))
      .collect();
  },
});

export const getKnowledgeChunksPublic = query({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", args.siteUrl))
      .collect();
  },
});

export const getCrawlJobs = query({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    return ctx.db
      .query("crawlJobs")
      .withIndex("by_site", (q) => q.eq("siteUrl", args.siteUrl))
      .order("desc")
      .take(10);
  },
});

export const deleteKnowledgeBase = mutation({
  args: { siteUrl: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_site", (q) => q.eq("siteUrl", args.siteUrl))
      .take(500);

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
  },
});
