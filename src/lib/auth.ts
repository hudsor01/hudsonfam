import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import Redis from "ioredis";

let redisAvailable = false;

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

const redis =
  globalForRedis.redis ??
  new Redis(
    process.env.REDIS_URL || "redis://redis.homelab.svc.cluster.local:6379",
    {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: "hudsonfam:session:",
      connectTimeout: 5_000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2_000);
      },
    }
  );

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("error", (err) => {
  console.error("[Redis] Error:", err.message);
  redisAvailable = false;
});
redis.on("ready", () => {
  redisAvailable = true;
});
redis.on("close", () => {
  redisAvailable = false;
});
redis.on("end", () => {
  console.error("[Redis] Connection ended, no more retries");
  redisAvailable = false;
});

redis.connect().catch((err) => {
  console.error("[Redis] Initial connection failed:", err.message);
  redisAvailable = false;
});

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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Promote first user to owner (bootstrap the site admin)
          const count = await prisma.user.count();
          if (count === 1) {
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
  secondaryStorage: {
    get: async (key) => {
      if (!redisAvailable) return null;
      try {
        return (await redis.get(key)) ?? null;
      } catch (err) {
        console.error("[Redis] GET failed:", (err as Error).message);
        return null;
      }
    },
    set: async (key, value, ttl) => {
      if (!redisAvailable) return;
      try {
        if (ttl) {
          await redis.set(key, value, "EX", ttl);
        } else {
          await redis.set(key, value);
        }
      } catch (err) {
        console.error("[Redis] SET failed:", (err as Error).message);
      }
    },
    delete: async (key) => {
      if (!redisAvailable) return;
      try {
        await redis.del(key);
      } catch (err) {
        console.error("[Redis] DEL failed:", (err as Error).message);
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
