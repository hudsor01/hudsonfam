"use server";

import { requireRole } from "@/lib/session";
import prisma from "@/lib/prisma";
import { deleteImageFiles } from "@/lib/images";
import { revalidatePath } from "next/cache";

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

  // Read paths before deletion so we can clean R2 objects
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { originalPath: true, thumbnailPath: true },
  });

  await prisma.photo.delete({ where: { id } });

  // Delete R2 objects after the DB row is gone (best-effort; missing keys are silently ignored)
  if (photo?.originalPath) {
    await deleteImageFiles(id, photo.originalPath);
  }

  revalidatePath("/dashboard/photos");
  revalidatePath("/photos");
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
