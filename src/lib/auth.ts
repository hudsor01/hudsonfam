import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import Redis from "ioredis";

const redis = new Redis(
  process.env.REDIS_URL || "redis://redis.homelab.svc.cluster.local:6379",
  {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keyPrefix: "hudsonfam:session:",
  }
);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
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
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ?? null;
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, value, "EX", ttl);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
});

export type Session = typeof auth.$Infer.Session;
