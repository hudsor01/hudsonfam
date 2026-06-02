import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  // Both the apex and www are valid origins (the non-canonical one 308-redirects
  // to the canonical), plus localhost for dev. Without this, better-auth only
  // trusts baseURL's origin and rejects sign-in requests from the other host
  // with a 403 on /api/auth/sign-in/*.
  trustedOrigins: [
    "https://thehudsonfam.com",
    "https://www.thehudsonfam.com",
    "http://localhost:3000",
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
            if (process.env.NODE_ENV !== "production") {
              console.log(`[auth] Auto-promoting ${user.email} to owner role`);
            }
            await prisma.user.update({
              where: { id: user.id },
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
