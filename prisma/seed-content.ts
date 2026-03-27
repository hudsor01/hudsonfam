import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding sample content...");

  // --- Sample Events ---
  const existingEvents = await prisma.event.count();
  if (existingEvents === 0) {
    await prisma.event.createMany({
      data: [
        {
          title: "Easter Brunch",
          description: "Family brunch at the new house. Bring your appetite.",
          location: "Our place",
          startDate: new Date("2026-04-05T11:00:00-05:00"),
          endDate: new Date("2026-04-05T14:00:00-05:00"),
          allDay: false,
          createdById: "seed",
          visibility: "PUBLIC",
        },
        {
          title: "Dallas Arboretum Visit",
          description: "Spring flowers are in bloom. Let's go see them.",
          location: "Dallas Arboretum",
          startDate: new Date("2026-04-12T10:00:00-05:00"),
          endDate: new Date("2026-04-12T16:00:00-05:00"),
          allDay: false,
          createdById: "seed",
          visibility: "PUBLIC",
        },
        {
          title: "Game Night",
          description: "Board games, snacks, and questionable strategy.",
          location: "Our place",
          startDate: new Date("2026-04-18T19:00:00-05:00"),
          endDate: new Date("2026-04-18T23:00:00-05:00"),
          allDay: false,
          createdById: "seed",
          visibility: "FAMILY",
        },
        {
          title: "Memorial Day Weekend",
          description: "Long weekend plans TBD. Suggestions welcome.",
          location: null,
          startDate: new Date("2026-05-23T00:00:00-05:00"),
          endDate: new Date("2026-05-25T23:59:00-05:00"),
          allDay: true,
          createdById: "seed",
          visibility: "PUBLIC",
        },
        {
          title: "Summer BBQ",
          description: "Kicking off summer the right way. Burgers, dogs, and cold drinks.",
          location: "Backyard",
          startDate: new Date("2026-06-06T16:00:00-05:00"),
          endDate: new Date("2026-06-06T21:00:00-05:00"),
          allDay: false,
          createdById: "seed",
          visibility: "PUBLIC",
        },
      ],
    });
    console.log("  Created 5 sample events");
  } else {
    console.log(`  Events already exist (${existingEvents}), skipping`);
  }

  // --- Sample Photo metadata (no actual images — just DB records for layout testing) ---
  const existingPhotos = await prisma.photo.count();
  if (existingPhotos === 0) {
    // Create a sample album first
    const album = await prisma.album.create({
      data: {
        title: "Moving to Dallas",
        slug: "moving-to-dallas",
        description: "Photos from our big move and first days in Dallas.",
        date: new Date("2026-03-01"),
      },
    });

    await prisma.photo.createMany({
      data: [
        {
          title: "The moving truck",
          caption: "Everything we own, packed into one truck.",
          albumId: album.id,
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
          albumId: album.id,
          originalPath: "https://images.unsplash.com/photo-1531260898656-0d22303e5eb5?w=1600&q=80&auto=format&fit=crop",
          thumbnailPath: "https://images.unsplash.com/photo-1531260898656-0d22303e5eb5?w=400&q=80&auto=format&fit=crop",
          width: 1600,
          height: 900,
          takenAt: new Date("2026-03-01T18:30:00"),
          uploadedById: "seed",
        },
        {
          title: "White Rock Lake",
          caption: "Morning walk around the lake.",
          albumId: album.id,
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
          albumId: album.id,
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
          albumId: album.id,
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
          albumId: album.id,
          originalPath: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=80&auto=format&fit=crop",
          thumbnailPath: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80&auto=format&fit=crop",
          width: 1600,
          height: 1200,
          takenAt: new Date("2026-03-02T22:00:00"),
          uploadedById: "seed",
        },
      ],
    });
    console.log("  Created 1 sample album with 6 photos");
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
