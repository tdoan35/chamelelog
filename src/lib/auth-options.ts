import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo read:user user:email",
        },
      },
    }),
  ],
  events: {
    async signIn({ user, account, profile }) {
      if (!account || !user.id) return;

      // Refresh OAuth tokens
      await db.account.updateMany({
        where: {
          userId: user.id,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
        data: {
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        },
      });

      // Store GitHub username from profile or by fetching from GitHub API
      let login = (profile as { login?: string })?.login;
      if (!login && account.access_token) {
        try {
          const res = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });
          const gh = await res.json();
          login = gh.login;
        } catch {
          // Silently continue — username will be set on next sign-in
        }
      }
      if (login) {
        await db.user.update({
          where: { id: user.id },
          data: { username: login },
        });
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
