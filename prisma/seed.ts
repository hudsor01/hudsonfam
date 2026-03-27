import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.user.findFirst({
    where: { role: "owner" },
  });

  if (existing) {
    console.log(`Owner already exists: ${existing.email}`);
  } else {
    console.log("No owner found. The first user to sign in via Google OAuth");
    console.log("should be promoted to owner role manually:");
    console.log("");
    console.log('  UPDATE "user" SET role = \'owner\' WHERE email = \'your@email.com\';');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
