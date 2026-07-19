import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

// Called by the widget when a visitor sends a message
export const visitorSendMessage = mutation({
  args: {
    sessionId: v.string(),
    content: v.string(),
    siteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get or create visitor
    let visitor = await ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!visitor) {
      const now = new Date().toISOString();
      const vId = await ctx.db.insert("visitors", {
        sessionId: args.sessionId,
        siteUrl: args.siteUrl,
        isOnline: true,
        lastSeen: now,
      });
      visitor = await ctx.db.get(vId);
    }

    if (!visitor) throw new ConvexError({ message: "Visitor not found", code: "NOT_FOUND" });

    // Get or create conversation
    let convo = await ctx.db
      .query("conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!convo) {
      const now = new Date().toISOString();
      const cId = await ctx.db.insert("conversations", {
        visitorId: visitor._id,
        sessionId: args.sessionId,
        status: "ai_handling",
        aiStruggling: false,
        agentMode: false,
        lastMessageAt: now,
        siteUrl: args.siteUrl,
      });
      convo = await ctx.db.get(cId);
    }

    if (!convo) throw new ConvexError({ message: "Conversation not found", code: "NOT_FOUND" });

    // Save visitor message
    const now = new Date().toISOString();
    await ctx.db.insert("messages", {
      conversationId: convo._id,
      role: "visitor",
      content: args.content,
      timestamp: now,
    });

    await ctx.db.patch(convo._id, { lastMessageAt: now });
    await ctx.db.patch(visitor._id, { isOnline: true, lastSeen: now });

    // If agent mode is on, don't trigger AI
    if (convo.agentMode) {
      return { conversationId: convo._id, agentMode: true };
    }

    // Get recent messages for context
    const recentMsgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) => q.eq("conversationId", convo._id))
      .order("desc")
      .take(10);

    const messageHistory = recentMsgs
      .reverse()
      .slice(0, -1) // exclude the one we just saved
      .map((m) => ({ role: m.role, content: m.content }));

    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.ai.generateAiReply, {
      conversationId: convo._id,
      visitorMessage: args.content,
      siteUrl: args.siteUrl,
      messageHistory,
    });

    return { conversationId: convo._id, agentMode: false };
  },
});

// Widget calls this to register visitor presence + get push notification to agent
export const widgetInit = mutation({
  args: {
    sessionId: v.string(),
    currentPage: v.string(),
    currentPageTitle: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    siteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    let visitor = await ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (visitor) {
      await ctx.db.patch(visitor._id, {
        currentPage: args.currentPage,
        currentPageTitle: args.currentPageTitle,
        isOnline: true,
        lastSeen: now,
      });
    } else {
      const vId = await ctx.db.insert("visitors", {
        sessionId: args.sessionId,
        currentPage: args.currentPage,
        currentPageTitle: args.currentPageTitle,
        referrer: args.referrer,
        userAgent: args.userAgent,
        siteUrl: args.siteUrl,
        isOnline: true,
        lastSeen: now,
      });
      visitor = await ctx.db.get(vId);

      // New visitor — schedule push notification to agents
      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendNotification, {
        title: "New Visitor",
        body: `A visitor just landed on ${args.siteUrl ?? "your site"}`,
        urgency: "normal",
      });
    }

    // Record page view
    if (visitor) {
      await ctx.db.insert("pageViews", {
        visitorId: visitor._id,
        sessionId: args.sessionId,
        url: args.currentPage,
        title: args.currentPageTitle,
        timestamp: now,
      });
    }

    return { visitorId: visitor?._id };
  },
});
