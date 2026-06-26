import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding sample content...");

  // --- Sample Photo metadata (no actual images — just DB records for layout testing) ---
  const existingPhotos = await prisma.photo.count();
  if (existingPhotos === 0) {
    // Create a sample collection first
    const collection = await prisma.collection.create({
      data: {
        title: "Moving to Dallas",
        slug: "moving-to-dallas",
        description: "Photos from our big move and first days in Dallas.",
        kind: "album",
        date: new Date("2026-03-01"),
      },
    });

    const seedPhotos = [
      {
        title: "The moving truck",
        caption: "Everything we own, packed into one truck.",
        originalPath: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=1600&q=80&auto=format&fit=crop",
        thumbnailPath: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&q=80&auto=format&fit=crop",
        width: 1600,
        height: 1200,
        takenAt: new Date("2026-03-01T08:00:00"),
        uploadedById: "seed",
      },
      {
        title: "First sunset in Dallas",
        caption: "Texas sunsets do not disappoint.",
        originalPath: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1600&q=80&auto=format&fit=crop",
        thumbnailPath: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&q=80&auto=format&fit=crop",
        width: 1600,
        height: 900,
        takenAt: new Date("2026-03-01T18:30:00"),
        uploadedById: "seed",
      },
      {
        title: "White Rock Lake",
        caption: "Morning walk around the lake.",
        originalPath: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop",
        thumbnailPath: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop",
        width: 1200,
        height: 1600,
        takenAt: new Date("2026-03-05T07:45:00"),
        uploadedById: "seed",
      },
      {
        title: "New kitchen",
        caption: "The most important room — operational.",
        originalPath: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80&auto=format&fit=crop",
        thumbnailPath: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80&auto=format&fit=crop",
        width: 1600,
        height: 1200,
        takenAt: new Date("2026-03-03T12:00:00"),
        uploadedById: "seed",
      },
      {
        title: "Bishop Arts coffee",
        caption: "Found our new favorite coffee spot.",
        originalPath: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80&auto=format&fit=crop",
        thumbnailPath: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&auto=format&fit=crop",
        width: 1200,
        height: 1200,
        takenAt: new Date("2026-03-08T09:15:00"),
        uploadedById: "seed",
      },
      {
        title: "Homelab back online",
        caption: "Priorities. The server was set up before the couch.",
        originalPath: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=80&auto=format&fit=crop",
        thumbnailPath: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80&auto=format&fit=crop",
        width: 1600,
        height: 1200,
        takenAt: new Date("2026-03-02T22:00:00"),
        uploadedById: "seed",
      },
    ];

    for (let i = 0; i < seedPhotos.length; i++) {
      await prisma.photo.create({
        data: {
          ...seedPhotos[i],
          published: true,
          collections: { create: { collectionId: collection.id, sortOrder: i } },
        },
      });
    }
    console.log("  Created 1 sample collection with 6 photos");
  } else {
    console.log(`  Photos already exist (${existingPhotos}), skipping`);
  }

  await prisma.$disconnect();
  console.log("Content seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
