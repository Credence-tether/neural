import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { getAuthUserId } from "@convex-dev/auth/server";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("visitor"), v.literal("ai"), v.literal("agent")),
    content: v.string(),
    aiProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let agentId: Id<"users"> | undefined = undefined;
    let agentName: string | undefined = undefined;

    if (args.role === "agent") {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const agent = await ctx.db.get(userId);
        agentId = userId;
        agentName = agent?.name;
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