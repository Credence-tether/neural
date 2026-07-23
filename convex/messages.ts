import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { getAuthUserId } from "@convex-dev/auth/server";

// Public entrypoint for agent replies only — visitor messages come in through
// widget:visitorSendMessage and AI replies through the internal aiHelpers
// mutations, both of which are unauthenticated by design. This one previously
// had no auth check at all, which let anyone forge an "agent" message into
// any conversationId.
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.literal("agent"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const agent = await ctx.db.get(userId);
    const agentId: Id<"users"> = userId;
    const agentName: string | undefined = agent?.name;

    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "agent",
      content: args.content,
      agentId,
      agentName,
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