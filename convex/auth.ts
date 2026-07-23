import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// Signup is invite-only: the very first account bootstraps as admin, and
// every account after that must have its email listed in ALLOWED_AGENT_EMAILS
// (comma-separated, set via `npx convex env set ALLOWED_AGENT_EMAILS ...`).
// Without this, anyone who finds /dashboard could self-register and get full
// access to every visitor conversation and their personal info.
function isAllowedNewAgentEmail(email: string | undefined): boolean {
  const allowlist = (process.env.ALLOWED_AGENT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowlist.includes(email.toLowerCase());
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;

      const email = args.profile.email as string | undefined;
      const isFirstUser = (await ctx.db.query("users").first()) === null;

      if (!isFirstUser && !isAllowedNewAgentEmail(email)) {
        throw new ConvexError({
          message: "Signup is invite-only. Contact your administrator for access.",
          code: "FORBIDDEN",
        });
      }

      return await ctx.db.insert("users", {
        email,
        name: args.profile.name as string | undefined,
        role: isFirstUser ? "admin" : "agent",
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });
    },
  },
});