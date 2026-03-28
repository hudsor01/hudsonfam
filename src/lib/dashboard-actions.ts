"use server";

import { requireRole } from "@/lib/session";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// --------------- Posts ---------------

export async function createPost(formData: FormData) {
  const session = await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title");
  const slug = formData.get("slug");
  if (!title || !slug) throw new Error("Title and slug are required");

  const excerpt = formData.get("excerpt") as string | null;
  const tags = (formData.get("tags") as string || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const rawStatus = formData.get("status") as string | null;
  const status = rawStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const coverImage = formData.get("coverImage") as string | null;

  await prisma.blogPost.create({
    data: {
      title: title as string,
      slug: slug as string,
      excerpt: excerpt || null,
      tags,
      status,
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
  const title = formData.get("title");
  const slug = formData.get("slug");
  if (!title || !slug) throw new Error("Title and slug are required");

  const excerpt = formData.get("excerpt") as string | null;
  const tags = (formData.get("tags") as string || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const rawStatus = formData.get("status") as string | null;
  const status = rawStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const coverImage = formData.get("coverImage") as string | null;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  const isNewlyPublished =
    status === "PUBLISHED" && existing?.status !== "PUBLISHED";

  await prisma.blogPost.update({
    where: { id },
    data: {
      title: title as string,
      slug: slug as string,
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
  const title = formData.get("title");
  const slug = formData.get("slug");
  if (!title || !slug) throw new Error("Title and slug are required");

  const description = formData.get("description") as string | null;
  const dateStr = formData.get("date") as string | null;

  await prisma.album.create({
    data: {
      title: title as string,
      slug: slug as string,
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
  const title = formData.get("title");
  const slug = formData.get("slug");
  if (!title || !slug) throw new Error("Title and slug are required");

  const description = formData.get("description") as string | null;
  const dateStr = formData.get("date") as string | null;
  const coverPhotoId = formData.get("coverPhotoId") as string | null;

  await prisma.album.update({
    where: { id },
    data: {
      title: title as string,
      slug: slug as string,
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
  const title = formData.get("title");
  if (!title) throw new Error("Title is required");

  const description = formData.get("description") as string | null;
  const location = formData.get("location") as string | null;
  const startDate = formData.get("startDate");
  if (!startDate) throw new Error("Start date is required");
  const parsedStartDate = new Date(startDate as string);
  if (isNaN(parsedStartDate.getTime())) throw new Error("Invalid start date");

  const endDate = formData.get("endDate") as string | null;
  const parsedEndDate = endDate ? new Date(endDate) : null;
  if (parsedEndDate && isNaN(parsedEndDate.getTime())) throw new Error("Invalid end date");

  const allDay = formData.get("allDay") === "on";
  const rawVisibility = formData.get("visibility") as string | null;
  const visibility = rawVisibility === "FAMILY" ? "FAMILY" : "PUBLIC";

  await prisma.event.create({
    data: {
      title: title as string,
      description: description || null,
      location: location || null,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
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
  const title = formData.get("title");
  if (!title) throw new Error("Title is required");

  const description = formData.get("description") as string | null;
  const location = formData.get("location") as string | null;
  const startDate = formData.get("startDate");
  if (!startDate) throw new Error("Start date is required");
  const parsedStartDate = new Date(startDate as string);
  if (isNaN(parsedStartDate.getTime())) throw new Error("Invalid start date");

  const endDate = formData.get("endDate") as string | null;
  const parsedEndDate = endDate ? new Date(endDate) : null;
  if (parsedEndDate && isNaN(parsedEndDate.getTime())) throw new Error("Invalid end date");

  const allDay = formData.get("allDay") === "on";
  const rawVisibility = formData.get("visibility") as string | null;
  const visibility = rawVisibility === "FAMILY" ? "FAMILY" : "PUBLIC";

  await prisma.event.update({
    where: { id },
    data: {
      title: title as string,
      description: description || null,
      location: location || null,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
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
  const content = formData.get("content");
  if (!content) throw new Error("Content is required");

  const rawVisibility = formData.get("visibility") as string | null;
  const visibility = rawVisibility === "FAMILY" ? "FAMILY" : "PUBLIC";

  await prisma.familyUpdate.create({
    data: {
      content: content as string,
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

// --------------- Quick-create (no redirect) ---------------

export async function quickCreateEvent(formData: FormData) {
  const session = await requireRole(["owner", "admin", "member"]);
  const title = formData.get("title");
  if (!title) throw new Error("Title is required");

  const startDate = formData.get("startDate");
  if (!startDate) throw new Error("Start date is required");
  const parsedStartDate = new Date(startDate as string);
  if (isNaN(parsedStartDate.getTime())) throw new Error("Invalid start date");

  await prisma.event.create({
    data: {
      title: title as string,
      startDate: parsedStartDate,
      allDay: true,
      visibility: "PUBLIC",
      createdById: session.user.id,
    },
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
}

export async function quickCreateUpdate(formData: FormData) {
  const session = await requireRole(["owner", "admin", "member"]);
  const content = formData.get("content");
  if (!content) throw new Error("Content is required");

  await prisma.familyUpdate.create({
    data: {
      content: content as string,
      visibility: "PUBLIC",
      postedById: session.user.id,
    },
  });

  revalidatePath("/dashboard/updates");
  revalidatePath("/dashboard");
  revalidatePath("/family");
}

// --------------- Invites ---------------

export async function createInvite(formData: FormData) {
  const session = await requireRole(["owner"]);
  const email = formData.get("email") as string | null;
  const rawRole = formData.get("role") as string | null;
  const allowedRoles = ["member", "admin"];
  const role = rawRole && allowedRoles.includes(rawRole) ? rawRole : "member";

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
