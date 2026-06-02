import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  // Both the apex and www are valid origins (the non-canonical one 308-redirects
  // to the canonical). Without this, better-auth only trusts baseURL's origin and
  // rejects sign-in requests from the other host with a 403 on /api/auth/sign-in/*.
  // localhost is dev-only — never a trusted origin in production.
  trustedOrigins: [
    "https://thehudsonfam.com",
    "https://www.thehudsonfam.com",
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    admin({
      defaultRole: "member",
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const ownerEmail = process.env.OWNER_EMAIL;
          if (ownerEmail && user.email === ownerEmail) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "owner" },
            });
          }
        },
      },
    },
    // Self-heal the owner role on sign-in too. The create hook above only fires
    // when a user is first created — a user RESTORED from a backup (or one that
    // existed before OWNER_EMAIL was configured) links via OAuth without ever
    // running it, leaving the owner stuck as "member". This idempotent check
    // promotes on session creation, writing only when the role is actually wrong.
    session: {
      create: {
        after: async (session) => {
          const ownerEmail = process.env.OWNER_EMAIL;
          if (!ownerEmail) return;
          const u = await prisma.user.findUnique({
            where: { id: session.userId },
          });
          if (u && u.email === ownerEmail && u.role !== "owner") {
            await prisma.user.update({
              where: { id: u.id },
              data: { role: "owner" },
            });
          }
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
