import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaPg(
    {
      connectionString: process.env.DATABASE_URL!,
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
