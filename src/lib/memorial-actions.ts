"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitMemory(formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email") as string | null;
  const relationship = formData.get("relationship") as string | null;
  const content = formData.get("content");

  if (!name || !content) {
    throw new Error("Name and memory are required");
  }

  const nameStr = name.toString().trim();
  const contentStr = content.toString().trim();

  if (nameStr.length === 0 || contentStr.length === 0) {
    throw new Error("Name and memory cannot be empty");
  }

  if (contentStr.length > 5000) {
    throw new Error("Memory must be under 5000 characters");
  }

  await prisma.memory.create({
    data: {
      name: nameStr,
      email: email?.trim() || null,
      relationship: relationship?.trim() || null,
      content: contentStr,
      approved: true,
    },
  });

  revalidatePath("/richard-hudson-sr");
}
