import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent users (support staff)
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.optional(v.union(v.literal("agent"), v.literal("admin"))),
    isOnline: v.optional(v.boolean()),
    lastSeen: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  // Visitor sessions (anonymous website visitors)
  visitors: defineTable({
    sessionId: v.string(), // unique per visitor browser session
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    ip: v.optional(v.string()),
    currentPage: v.optional(v.string()),
    currentPageTitle: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    // Site the widget is on
    siteUrl: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.string(), // ISO 8601
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_isOnline", ["isOnline"]),

  // Page navigation history for a visitor
  pageViews: defineTable({
    visitorId: v.id("visitors"),
    sessionId: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    timestamp: v.string(), // ISO 8601
  })
    .index("by_visitor", ["visitorId"])
    .index("by_session", ["sessionId"]),

  // Conversations (one per visitor session)
  conversations: defineTable({
    visitorId: v.id("visitors"),
    sessionId: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("ai_handling"),
      v.literal("agent_handling"),
      v.literal("waiting_agent"),
      v.literal("closed")
    ),
    assignedAgentId: v.optional(v.id("users")),
    subject: v.optional(v.string()),
    // AI struggling flag triggers push notification
    aiStruggling: v.boolean(),
    // Agent takeover flag
    agentMode: v.boolean(),
    lastMessageAt: v.string(), // ISO 8601
    // Visitor info snapshot
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    siteUrl: v.optional(v.string()),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_lastMessage", ["lastMessageAt"]),

  // Messages in a conversation
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("visitor"),
      v.literal("ai"),
      v.literal("agent")
    ),
    content: v.string(),
    agentId: v.optional(v.id("users")),
    agentName: v.optional(v.string()),
    // Metadata for AI messages
    aiProvider: v.optional(v.string()),
    isThinking: v.optional(v.boolean()), // streaming indicator
    timestamp: v.string(), // ISO 8601
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_time", ["conversationId", "timestamp"]),

  // Knowledge base chunks (for RAG)
  knowledgeChunks: defineTable({
    siteUrl: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    content: v.string(),
    embedding: v.array(v.number()),
    chunkIndex: v.number(),
  })
    .index("by_site", ["siteUrl"])
    .index("by_url", ["url"]),

  // Crawl jobs
  crawlJobs: defineTable({
    siteUrl: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    pagesFound: v.optional(v.number()),
    pagesCrawled: v.optional(v.number()),
    error: v.optional(v.string()),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
  }).index("by_site", ["siteUrl"]),

  // Push notification identities (agents)
  pushIdentities: defineTable({
    secret: v.string(),
    visitorId: v.string(),
  })
    .index("by_secret", ["secret"])
    .index("by_visitorId", ["visitorId"]),

  // Canned responses (agent quick-reply templates)
  cannedResponses: defineTable({
    title: v.string(),
    shortcut: v.string(),
    content: v.string(),
    createdBy: v.id("users"),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_shortcut", ["shortcut"]),
});
