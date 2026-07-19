import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("visitor"), v.literal("ai"), v.literal("agent")),
    content: v.string(),
    aiProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let agentId: Id<"users"> | undefined = undefined;
    let agentName: string | undefined = undefined;

    if (args.role === "agent" && identity) {
      const agent = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      if (agent) {
        agentId = agent._id;
        agentName = agent.name;
      }
    }

    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      agentId: args.role === "agent" ? agentId : undefined,
      agentName: args.role === "agent" ? agentName : undefined,
      aiProvider: args.aiProvider,
      timestamp: new Date().toISOString(),
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: new Date().toISOString(),
    });

    return msgId;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(200);
  },
});

export const getRecentMessages = query({
  args: { conversationId: v.id("conversations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(args.limit ?? 10);
  },
});
