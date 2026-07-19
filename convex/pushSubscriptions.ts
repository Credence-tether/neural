import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const storeSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("pushSubscriptions", args);
    }
  },
});

export const deleteSubscriptionByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const getAllSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("pushSubscriptions").collect();
  },
});
