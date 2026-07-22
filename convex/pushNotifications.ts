"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export const getVapidPublicKey = action({
  args: {},
  handler: async () => {
    return { vapidPublicKey: process.env.VAPID_PUBLIC_KEY! };
  },
});

export const subscribe = action({
  args: { subscription: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be authenticated to subscribe");

    const sub = JSON.parse(args.subscription) as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await ctx.runMutation(internal.pushSubscriptions.storeSubscription, {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    });

    return { success: true };
  },
});

export const unsubscribe = action({
  args: { endpoint: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    await ctx.runMutation(internal.pushSubscriptions.deleteSubscriptionByEndpoint, {
      endpoint: args.endpoint,
    });
    return { success: true };
  },
});

export const sendNotification = internalAction({
  args: {
    title: v.string(),
    body: v.optional(v.string()),
    icon: v.optional(v.string()),
    urgency: v.optional(
      v.union(v.literal("very-low"), v.literal("low"), v.literal("normal"), v.literal("high"))
    ),
  },
  handler: async (ctx, args) => {
    // ── Telegram mirror: every dashboard notification also goes to Telegram ──
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChatId) {
      const text = `\u{1F514} *${args.title.replace(/([_*\[\]()~\`>#+\-=|{}.!])/g, "\\$1")}*` +
        (args.body ? `\n${args.body.replace(/([_*\[\]()~\`>#+\-=|{}.!])/g, "\\$1")}` : "");
      try {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChatId,
            text,
            parse_mode: "MarkdownV2",
          }),
        });
      } catch (e) {
        console.error("Telegram notify failed:", e);
      }
    }

    configureWebPush();

    const subs = await ctx.runQuery(internal.pushSubscriptions.getAllSubscriptions);

    const payload = JSON.stringify({
      title: args.title,
      options: {
        body: args.body,
        icon: args.icon ?? "/icon/icon-192.png",
        badge: "/icon/icon-192.png",
      },
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { urgency: args.urgency ?? "high" }
          );
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await ctx.runMutation(internal.pushSubscriptions.deleteSubscriptionByEndpoint, {
              endpoint: sub.endpoint,
            });
          } else {
            console.error("Push send failed:", error);
          }
        }
      })
    );
  },
});
