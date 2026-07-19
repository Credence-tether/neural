import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Called by the widget to register/update a visitor
export const upsertVisitor = mutation({
  args: {
    sessionId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    currentPage: v.optional(v.string()),
    currentPageTitle: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    siteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentPage: args.currentPage ?? existing.currentPage,
        currentPageTitle: args.currentPageTitle ?? existing.currentPageTitle,
        isOnline: true,
        lastSeen: now,
        name: args.name ?? existing.name,
        email: args.email ?? existing.email,
      });
      return existing._id;
    }

    const visitorId = await ctx.db.insert("visitors", {
      sessionId: args.sessionId,
      name: args.name,
      email: args.email,
      currentPage: args.currentPage,
      currentPageTitle: args.currentPageTitle,
      referrer: args.referrer,
      userAgent: args.userAgent,
      siteUrl: args.siteUrl,
      isOnline: true,
      lastSeen: now,
    });
    return visitorId;
  },
});

export const updateVisitorLocation = mutation({
  args: {
    sessionId: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (visitor) {
      await ctx.db.patch(visitor._id, {
        country: args.country,
        city: args.city,
        ip: args.ip,
      });
    }
  },
});

export const updateVisitorPage = mutation({
  args: {
    sessionId: v.string(),
    currentPage: v.string(),
    currentPageTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!visitor) return;

    const now = new Date().toISOString();
    await ctx.db.patch(visitor._id, {
      currentPage: args.currentPage,
      currentPageTitle: args.currentPageTitle,
      isOnline: true,
      lastSeen: now,
    });

    // Record page view
    await ctx.db.insert("pageViews", {
      visitorId: visitor._id,
      sessionId: args.sessionId,
      url: args.currentPage,
      title: args.currentPageTitle,
      timestamp: now,
    });
  },
});

export const markVisitorOffline = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (visitor) {
      await ctx.db.patch(visitor._id, {
        isOnline: false,
        lastSeen: new Date().toISOString(),
      });
    }
  },
});

export const getVisitorBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("visitors")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

export const getOnlineVisitors = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    return ctx.db
      .query("visitors")
      .withIndex("by_isOnline", (q) => q.eq("isOnline", true))
      .order("desc")
      .take(100);
  },
});

export const getAllVisitors = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    return ctx.db.query("visitors").order("desc").take(200);
  },
});

export const getVisitorPageViews = query({
  args: { visitorId: v.id("visitors") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    return ctx.db
      .query("pageViews")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .order("desc")
      .take(50);
  },
});
