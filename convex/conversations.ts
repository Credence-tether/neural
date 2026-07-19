import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const getOrCreateConversation = mutation({
  args: {
    sessionId: v.string(),
    visitorId: v.id("visitors"),
    siteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) return existing._id;

    const visitor = await ctx.db.get(args.visitorId);
    const now = new Date().toISOString();

    const convoId = await ctx.db.insert("conversations", {
      visitorId: args.visitorId,
      sessionId: args.sessionId,
      status: "ai_handling",
      aiStruggling: false,
      agentMode: false,
      lastMessageAt: now,
      visitorName: visitor?.name,
      visitorEmail: visitor?.email,
      siteUrl: args.siteUrl,
    });

    return convoId;
  },
});

export const getConversationBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.conversationId);
  },
});

export const listConversations = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const q = ctx.db.query("conversations").order("desc");
    return q.paginate(args.paginationOpts);
  },
});

export const getAllConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    return ctx.db.query("conversations").order("desc").take(100);
  },
});

export const agentTakeOver = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const agent = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!agent) throw new ConvexError({ message: "Agent not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.conversationId, {
      agentMode: true,
      status: "agent_handling",
      assignedAgentId: agent._id,
      aiStruggling: false,
    });
  },
});

export const agentLeave = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    await ctx.db.patch(args.conversationId, {
      agentMode: false,
      status: "ai_handling",
      assignedAgentId: undefined,
    });
  },
});

export const closeConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    await ctx.db.patch(args.conversationId, {
      status: "closed",
      agentMode: false,
    });
  },
});

export const markAiStruggling = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      aiStruggling: true,
      status: "waiting_agent",
    });
  },
});

export const updateLastMessage = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: new Date().toISOString(),
    });
  },
});

export const updateVisitorInfo = mutation({
  args: {
    conversationId: v.id("conversations"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      visitorName: args.name,
      visitorEmail: args.email,
    });
  },
});
