import { z } from "zod";

// ─── Post ────────────────────────────────────────────────────────────────────
export const postFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  tags: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

// ─── Update ──────────────────────────────────────────────────────────────────
export const updateFormSchema = z.object({
  content: z.string().min(1, "Content is required"),
  visibility: z.enum(["PUBLIC", "FAMILY"]),
});

export type UpdateFormValues = z.infer<typeof updateFormSchema>;

// ─── Collection ───────────────────────────────────────────────────────────────
export const collectionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type CollectionFormValues = z.infer<typeof collectionFormSchema>;
