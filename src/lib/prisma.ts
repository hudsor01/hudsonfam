import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

/**
 * node-postgres warns that `sslmode=require|prefer|verify-ca` are currently
 * treated as aliases for `verify-full` and will adopt weaker libpq semantics in
 * pg v9. Make the mode explicit as `verify-full` — identical behavior today,
 * strongest verification (cert chain + hostname), and silences the deprecation
 * warning. Neon serves certs from a public CA, so verify-full validates cleanly.
 */
function withStrictSsl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/\bsslmode=(?:require|prefer|verify-ca)\b/i, "sslmode=verify-full");
}

function createPrismaClient() {
  const adapter = new PrismaPg(
    {
      connectionString: withStrictSsl(process.env.DATABASE_URL),
      max: 10,
      min: 2,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      maxLifetimeSeconds: 1800,
      statement_timeout: 30_000,
      idle_in_transaction_session_timeout: 60_000,
    },
    {
      onPoolError: (err) => {
        console.error("[Prisma Pool Error]", err.message);
      },
      onConnectionError: (err) => {
        console.error("[Prisma Connection Error]", err.message);
      },
    }
  );
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
