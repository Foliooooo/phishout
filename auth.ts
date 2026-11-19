import { randomUUID } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPasswordVersion, normalizeEmail, validPassword, verifyAccount } from "@/lib/accounts";
import { getDatabase } from "@/lib/mongodb";

declare module "next-auth" {
  interface User {
    passwordVersion?: number;
  }

  interface Session {
    user: { id: string; email?: string | null };
    sessionId: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: { signIn: "/sign-in" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize({ email, password }) {
        const normalized = normalizeEmail(email);
        if (!normalized || !validPassword(password)) return null;
        return verifyAccount(normalized, password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const now = new Date();
        const sessionId = randomUUID();
        const db = getDatabase();

        await db.collection<{ _id: string }>("accounts").updateOne(
          { _id: user.id },
          { $setOnInsert: { firstSeenAt: now }, $max: { lastSeenAt: now } },
          { upsert: true },
        );
        await db.collection<{ _id: string; userId: string; firstSeenAt: Date; lastSeenAt: Date }>("account_sessions").insertOne({
          _id: sessionId,
          userId: user.id,
          firstSeenAt: now,
          lastSeenAt: now,
        });
        token.sessionId = sessionId;
        token.passwordVersion = user.passwordVersion ?? 0;
      } else if (token.email) {
        const version = await getPasswordVersion(token.email);
        if (version === null || version !== (token.passwordVersion ?? 0)) return null;
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: { ...session.user, id: token.sub ?? "" },
        sessionId: typeof token.sessionId === "string" ? token.sessionId : "",
      };
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && typeof message.token?.sessionId === "string") {
        await getDatabase().collection<{ _id: string }>("account_sessions").updateOne(
          { _id: message.token.sessionId },
          { $set: { signedOutAt: new Date() } },
        ).catch((error) => console.error("Could not record sign-out", error));
      }
    },
  },
});
