"use server";

import { requireRole } from "@/lib/session";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// --------------- Posts ---------------

export async function createPost(formData: FormData) {
  const session = await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const excerpt = formData.get("excerpt") as string | null;
  const tags = (formData.get("tags") as string || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const status = formData.get("status") as "DRAFT" | "PUBLISHED";
  const coverImage = formData.get("coverImage") as string | null;

  await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      tags,
      status: status || "DRAFT",
      coverImage: coverImage || null,
      authorId: session.user.id,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/posts");
  revalidatePath("/blog");
  redirect("/dashboard/posts");
}

export async function updatePost(id: string, formData: FormData) {
  await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const excerpt = formData.get("excerpt") as string | null;
  const tags = (formData.get("tags") as string || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const status = formData.get("status") as "DRAFT" | "PUBLISHED";
  const coverImage = formData.get("coverImage") as string | null;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  const isNewlyPublished =
    status === "PUBLISHED" && existing?.status !== "PUBLISHED";

  await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      tags,
      status,
      coverImage: coverImage || null,
      publishedAt: isNewlyPublished ? new Date() : existing?.publishedAt,
    },
  });

  revalidatePath("/dashboard/posts");
  revalidatePath("/blog");
  redirect("/dashboard/posts");
}

export async function deletePost(id: string) {
  await requireRole(["owner", "admin"]);
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath("/dashboard/posts");
  revalidatePath("/blog");
}

// --------------- Albums ---------------

export async function createAlbum(formData: FormData) {
  await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string | null;
  const dateStr = formData.get("date") as string | null;

  await prisma.album.create({
    data: {
      title,
      slug,
      description: description || null,
      date: dateStr ? new Date(dateStr) : null,
    },
  });

  revalidatePath("/dashboard/photos");
  revalidatePath("/photos");
  redirect("/dashboard/photos/albums");
}

export async function updateAlbum(id: string, formData: FormData) {
  await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string | null;
  const dateStr = formData.get("date") as string | null;
  const coverPhotoId = formData.get("coverPhotoId") as string | null;

  await prisma.album.update({
    where: { id },
    data: {
      title,
      slug,
      description: description || null,
      date: dateStr ? new Date(dateStr) : null,
      coverPhotoId: coverPhotoId || null,
    },
  });

  revalidatePath("/dashboard/photos");
  revalidatePath("/photos");
  redirect("/dashboard/photos/albums");
}

// --------------- Events ---------------

export async function createEvent(formData: FormData) {
  const session = await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const location = formData.get("location") as string | null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string | null;
  const allDay = formData.get("allDay") === "on";
  const visibility = (formData.get("visibility") as "PUBLIC" | "FAMILY") || "PUBLIC";

  await prisma.event.create({
    data: {
      title,
      description: description || null,
      location: location || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      allDay,
      visibility,
      createdById: session.user.id,
    },
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/events");
  redirect("/dashboard/events");
}

export async function updateEvent(id: string, formData: FormData) {
  await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const location = formData.get("location") as string | null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string | null;
  const allDay = formData.get("allDay") === "on";
  const visibility = (formData.get("visibility") as "PUBLIC" | "FAMILY") || "PUBLIC";

  await prisma.event.update({
    where: { id },
    data: {
      title,
      description: description || null,
      location: location || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      allDay,
      visibility,
    },
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/events");
  redirect("/dashboard/events");
}

export async function deleteEvent(id: string) {
  await requireRole(["owner", "admin"]);
  await prisma.event.delete({ where: { id } });
  revalidatePath("/dashboard/events");
  revalidatePath("/events");
}

// --------------- Family Updates ---------------

export async function createUpdate(formData: FormData) {
  const session = await requireRole(["owner", "admin", "member"]);
  const content = formData.get("content") as string;
  const visibility = (formData.get("visibility") as "PUBLIC" | "FAMILY") || "PUBLIC";

  await prisma.familyUpdate.create({
    data: {
      content,
      visibility,
      postedById: session.user.id,
    },
  });

  revalidatePath("/dashboard/updates");
  revalidatePath("/family");
  redirect("/dashboard/updates");
}

export async function deleteUpdate(id: string) {
  await requireRole(["owner", "admin"]);
  await prisma.familyUpdate.delete({ where: { id } });
  revalidatePath("/dashboard/updates");
  revalidatePath("/family");
}

// --------------- Members (owner-only) ---------------

export async function updateUserRole(userId: string, role: string) {
  await requireRole(["owner"]);
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/dashboard/members");
}

export async function banUser(userId: string, reason: string) {
  await requireRole(["owner"]);
  await prisma.user.update({
    where: { id: userId },
    data: { banned: true, banReason: reason || null },
  });
  revalidatePath("/dashboard/members");
}

export async function unbanUser(userId: string) {
  await requireRole(["owner"]);
  await prisma.user.update({
    where: { id: userId },
    data: { banned: false, banReason: null, banExpires: null },
  });
  revalidatePath("/dashboard/members");
}

export async function deletePhoto(id: string) {
  await requireRole(["owner", "admin"]);
  await prisma.photo.delete({ where: { id } });
  revalidatePath("/dashboard/photos");
  revalidatePath("/photos");
}

// --------------- Invites ---------------

export async function createInvite(formData: FormData) {
  const session = await requireRole(["owner"]);
  const email = formData.get("email") as string | null;
  const role = (formData.get("role") as string) || "member";

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  await prisma.inviteToken.create({
    data: {
      token,
      email: email || null,
      role,
      expiresAt,
      createdBy: session.user.id,
    },
  });

  revalidatePath("/dashboard/members");
  return token;
}

export async function deleteInvite(id: string) {
  await requireRole(["owner"]);
  await prisma.inviteToken.delete({ where: { id } });
  revalidatePath("/dashboard/members");
}
