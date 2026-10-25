import { z } from "zod"

export const NOTE_COLORS = [
  "violet",
  "amber",
  "blue",
  "emerald",
  "rose",
  "slate",
] as const

export const NOTE_VIEWS = [
  "all",
  "pinned",
  "recent",
  "favorites",
  "trash",
] as const

export const NOTE_SORTS = ["edited", "created", "title"] as const

/**
 * UUID format validation regex
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(val: string): boolean {
  return UUID_REGEX.test(val)
}

/**
 * Schema for creating a note (POST /api/notes)
 */
export const createNoteSchema = z
  .object({
    title: z
      .string({ required_error: "Title is required" })
      .trim()
      .min(1, "Title cannot be blank")
      .max(200, "Title cannot exceed 200 characters"),
    content: z
      .string()
      .max(50000, "Content cannot exceed 50,000 characters")
      .default(""),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Tag cannot be empty")
          .max(50, "Tag cannot exceed 50 characters")
      )
      .transform((tags) =>
        Array.from(
          new Set(
            tags
              .map((t) => t.trim().toLowerCase())
              .filter((t) => t.length > 0)
          )
        )
      )
      .default([]),
    color: z
      .enum(NOTE_COLORS, {
        errorMap: () => ({
          message:
            "Invalid color accent. Must be one of: violet, amber, blue, emerald, rose, slate",
        }),
      })
      .default("violet"),
    pinned: z.boolean().default(false),
    favorite: z.boolean().default(false),
  })
  .strict({ message: "Unknown fields are not permitted in note creation" })

export type CreateNoteInput = z.infer<typeof createNoteSchema>

/**
 * Schema for updating a note (PATCH /api/notes/[id])
 */
export const updateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be blank")
      .max(200, "Title cannot exceed 200 characters")
      .optional(),
    content: z
      .string()
      .max(50000, "Content cannot exceed 50,000 characters")
      .optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Tag cannot be empty")
          .max(50, "Tag cannot exceed 50 characters")
      )
      .transform((tags) =>
        Array.from(
          new Set(
            tags
              .map((t) => t.trim().toLowerCase())
              .filter((t) => t.length > 0)
          )
        )
      )
      .optional(),
    color: z
      .enum(NOTE_COLORS, {
        errorMap: () => ({
          message:
            "Invalid color accent. Must be one of: violet, amber, blue, emerald, rose, slate",
        }),
      })
      .optional(),
    pinned: z.boolean().optional(),
    favorite: z.boolean().optional(),
    trashed: z.boolean().optional(),
  })
  .strict({ message: "Unknown fields are not permitted in note update" })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one valid field must be provided for update",
  })

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

/**
 * Schema for query parameters (GET /api/notes)
 */
export const notesQuerySchema = z.object({
  view: z.enum(NOTE_VIEWS).default("all"),
  tag: z.string().trim().max(50).optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(NOTE_SORTS).default("edited"),
})

export type NotesQueryInput = z.infer<typeof notesQuerySchema>
