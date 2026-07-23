import { v } from "convex/values";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Returns all analytics data needed for the dashboard in one call
export const getAnalytics = query({
  args: {
    range: v.union(v.literal("7d"), v.literal("30d")),
  },
  handler: async (ctx, args): Promise<{
    totalConversations: number;
    aiResolved: number;
    agentResolved: number;
    handoffCount: number;
    avgResponseTimeMs: number;
    volumeByDay: { date: string; count: number }[];
    topCountries: { country: string; count: number; countryCode?: string }[];
    busyHours: { hour: number; count: number }[];
    statusBreakdown: { status: string; count: number }[];
    resolvedToday: number;
    activeNow: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const days = args.range === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch all conversations in range (bounded — lastMessageAt index)
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessage", (q) => q.gte("lastMessageAt", since))
      .collect();

    const totalConversations = allConversations.length;

    // Status breakdown
    const statusMap = new Map<string, number>();
    for (const c of allConversations) {
      statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
    }
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    // AI vs agent resolved
    const aiResolved = allConversations.filter(
      (c) => c.status === "closed" && !c.agentMode && !c.assignedAgentId
    ).length;
    const agentResolved = allConversations.filter(
      (c) => c.status === "closed" && (c.agentMode || !!c.assignedAgentId)
    ).length;
    const handoffCount = allConversations.filter((c) => c.aiStruggling || c.status === "waiting_agent").length;

    // Active now (not closed)
    const activeNow = allConversations.filter((c) => c.status !== "closed").length;

    // Resolved today
    const resolvedToday = allConversations.filter(
      (c) => c.status === "closed" && c.lastMessageAt >= todayStart.toISOString()
    ).length;

    // Volume by day — bucket conversations by date of lastMessageAt
    const dayBuckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayBuckets.set(key, 0);
    }
    for (const c of allConversations) {
      const key = c.lastMessageAt.slice(0, 10);
      if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
    }
    const volumeByDay = Array.from(dayBuckets.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top countries from visitors
    const visitorIds = [...new Set(allConversations.map((c) => c.visitorId))];
    const countryMap = new Map<string, number>();
    const countryCodeByName = new Map<string, string>();
    // Fetch visitors in small batches to avoid N+1
    const visitors = await Promise.all(visitorIds.slice(0, 200).map((id) => ctx.db.get(id)));
    for (const v of visitors) {
      if (v?.country) {
        countryMap.set(v.country, (countryMap.get(v.country) ?? 0) + 1);
        if (v.countryCode && !countryCodeByName.has(v.country)) {
          countryCodeByName.set(v.country, v.countryCode);
        }
      }
    }
    const topCountries = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count, countryCode: countryCodeByName.get(country) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Busy hours — distribution of conversation start times by hour
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    for (const c of allConversations) {
      const hour = new Date(c.lastMessageAt).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }
    const busyHours = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Avg AI response time — sample first 50 conversations with messages
    let totalResponseMs = 0;
    let responseSamples = 0;
    const sampleConvos = allConversations.slice(0, 50);
    for (const convo of sampleConvos) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_conversation_time", (q) => q.eq("conversationId", convo._id))
        .take(20);

      for (let i = 1; i < msgs.length; i++) {
        const prev = msgs[i - 1];
        const curr = msgs[i];
        if (prev.role === "visitor" && (curr.role === "ai" || curr.role === "agent")) {
          const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
          if (diff > 0 && diff < 60000) {
            totalResponseMs += diff;
            responseSamples++;
          }
        }
      }
    }
    const avgResponseTimeMs = responseSamples > 0 ? Math.round(totalResponseMs / responseSamples) : 0;

    return {
      totalConversations,
      aiResolved,
      agentResolved,
      handoffCount,
      avgResponseTimeMs,
      volumeByDay,
      topCountries,
      busyHours,
      statusBreakdown,
      resolvedToday,
      activeNow,
    };
  },
});
