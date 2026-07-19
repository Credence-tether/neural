import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;
      return await ctx.db.insert("users", {
        email: args.profile.email as string | undefined,
        name: args.profile.name as string | undefined,
        role: "agent",
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });
    },
  },
});