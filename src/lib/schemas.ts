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

// ─── Event ───────────────────────────────────────────────────────────────────
export const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  allDay: z.boolean(),
  visibility: z.enum(["PUBLIC", "FAMILY"]),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

// ─── Update ──────────────────────────────────────────────────────────────────
export const updateFormSchema = z.object({
  content: z.string().min(1, "Content is required"),
  visibility: z.enum(["PUBLIC", "FAMILY"]),
});

export type UpdateFormValues = z.infer<typeof updateFormSchema>;

// ─── Album ───────────────────────────────────────────────────────────────────
export const albumFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  date: z.string().optional(),
  coverPhotoId: z.string().optional(),
});

export type AlbumFormValues = z.infer<typeof albumFormSchema>;

// ─── Memory ──────────────────────────────────────────────────────────────────
export const memoryFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  relationship: z.string().min(1, "Relationship is required"),
  content: z.string().min(10, "Please share at least a few words"),
});

export type MemoryFormValues = z.infer<typeof memoryFormSchema>;
