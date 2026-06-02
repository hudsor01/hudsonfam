import prisma from "@/lib/prisma";
import { Hero } from "@/components/public/hero";
import { connection } from "next/server";
import { Sidebar } from "@/components/public/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function HomePage() {
  await connection();

  // Fetch upcoming events from database
  const events = await prisma.event.findMany({
    where: {
      visibility: "PUBLIC",
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      startDate: true,
      location: true,
    },
  });

  // Fetch latest photos from database
  const photos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      thumbnailPath: true,
      title: true,
    },
  });

  const sidebarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.startDate.toISOString(),
    location: e.location,
  }));

  const sidebarPhotos = photos.map((p) => ({
    id: p.id,
    thumbnailPath: p.thumbnailPath,
    title: p.title,
  }));

  return (
    <div>
      <Hero />

      <Separator />

      <div className="max-w-7xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
        <Sidebar events={sidebarEvents} photos={sidebarPhotos} />
      </div>
    </div>
  );
}
