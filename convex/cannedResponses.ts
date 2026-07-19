import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    // Return all canned responses (shared across all agents)
    return ctx.db.query("cannedResponses").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    shortcut: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const shortcut = args.shortcut.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return ctx.db.insert("cannedResponses", {
      title: args.title.trim(),
      shortcut,
      content: args.content.trim(),
      createdBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("cannedResponses"),
    title: v.string(),
    shortcut: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const shortcut = args.shortcut.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      shortcut,
      content: args.content.trim(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("cannedResponses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    await ctx.db.delete(args.id);
  },
});
