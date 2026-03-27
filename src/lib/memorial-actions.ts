"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";

// --------------- Public: Submit Memory ---------------

export async function submitMemory(formData: FormData) {
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const phone = formData.get("phone") as string | null;
  const relationship = formData.get("relationship");
  const content = formData.get("content");

  if (!firstName || !lastName || !email || !relationship || !content) {
    throw new Error(
      "First name, last name, email, relationship, and memory are required"
    );
  }

  const firstNameStr = firstName.toString().trim();
  const lastNameStr = lastName.toString().trim();
  const emailStr = email.toString().trim();
  const relationshipStr = relationship.toString().trim();
  const contentStr = content.toString().trim();

  if (
    firstNameStr.length === 0 ||
    lastNameStr.length === 0 ||
    emailStr.length === 0 ||
    relationshipStr.length === 0 ||
    contentStr.length === 0
  ) {
    throw new Error("Required fields cannot be empty");
  }

  if (contentStr.length > 5000) {
    throw new Error("Memory must be under 5000 characters");
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
    throw new Error("Please enter a valid email address");
  }

  await prisma.memory.create({
    data: {
      firstName: firstNameStr,
      lastName: lastNameStr,
      email: emailStr,
      phone: phone?.trim() || null,
      relationship: relationshipStr,
      content: contentStr,
      approved: false,
    },
  });

  revalidatePath("/richard-hudson-sr");
}

// --------------- Owner-only: Memory Moderation ---------------

export async function approveMemory(id: string) {
  await requireRole(["owner"]);
  await prisma.memory.update({
    where: { id },
    data: { approved: true },
  });
  revalidatePath("/richard-hudson-sr");
  revalidatePath("/dashboard/memorial");
  revalidatePath("/dashboard/memorial/memories");
}

export async function rejectMemory(id: string) {
  await requireRole(["owner"]);
  await prisma.memory.delete({ where: { id } });
  revalidatePath("/richard-hudson-sr");
  revalidatePath("/dashboard/memorial");
  revalidatePath("/dashboard/memorial/memories");
}

// --------------- Owner-only: Memorial Media ---------------

export async function addMemorialMedia(formData: FormData) {
  await requireRole(["owner"]);

  const url = formData.get("url");
  const type = formData.get("type");
  const caption = formData.get("caption") as string | null;
  const sortOrder = formData.get("sortOrder");

  if (!url || !type) {
    throw new Error("URL and type are required");
  }

  const urlStr = url.toString().trim();
  const typeStr = type.toString().trim();

  if (!["photo", "video"].includes(typeStr)) {
    throw new Error("Type must be photo or video");
  }

  if (urlStr.length === 0) {
    throw new Error("URL cannot be empty");
  }

  await prisma.memorialMedia.create({
    data: {
      url: urlStr,
      type: typeStr,
      caption: caption?.trim() || null,
      sortOrder: sortOrder ? parseInt(sortOrder.toString(), 10) : 0,
    },
  });

  revalidatePath("/richard-hudson-sr");
  revalidatePath("/dashboard/memorial/media");
}

export async function removeMemorialMedia(id: string) {
  await requireRole(["owner"]);
  await prisma.memorialMedia.delete({ where: { id } });
  revalidatePath("/richard-hudson-sr");
  revalidatePath("/dashboard/memorial/media");
}

// --------------- Owner-only: Memorial Content ---------------

export async function updateMemorialContent(section: string, content: string) {
  await requireRole(["owner"]);

  const contentStr = content.trim();
  if (contentStr.length === 0) {
    throw new Error("Content cannot be empty");
  }

  await prisma.memorialContent.upsert({
    where: { section },
    update: { content: contentStr },
    create: { section, content: contentStr },
  });

  revalidatePath("/richard-hudson-sr");
  revalidatePath("/dashboard/memorial/content");
}
