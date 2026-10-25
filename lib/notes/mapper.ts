import type { NoteRow, NoteUpdate } from "@/lib/supabase/types"
import type { UpdateNoteInput } from "@/lib/validations/note"

/**
 * Shape of a note returned to the client (camelCase format).
 * Matches the frontend Note model exactly.
 */
export interface ClientNote {
  id: string
  title: string
  content: string
  tags: string[]
  color: string
  pinned: boolean
  favorite: boolean
  trashed: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Maps a database row (snake_case) to the frontend note model (camelCase).
 * Excludes internal database columns like user_id.
 */
export function mapNoteRowToClient(row: NoteRow): ClientNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: Array.isArray(row.tags) ? row.tags : [],
    color: row.color,
    pinned: row.is_pinned,
    favorite: row.is_favorite,
    trashed: row.is_trashed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Maps a validated frontend update patch (camelCase) to database columns (snake_case).
 */
export function mapClientUpdateToDb(patch: UpdateNoteInput): NoteUpdate {
  const dbUpdate: NoteUpdate = {}

  if (patch.title !== undefined) dbUpdate.title = patch.title
  if (patch.content !== undefined) dbUpdate.content = patch.content
  if (patch.tags !== undefined) dbUpdate.tags = patch.tags
  if (patch.color !== undefined) dbUpdate.color = patch.color
  if (patch.pinned !== undefined) dbUpdate.is_pinned = patch.pinned
  if (patch.favorite !== undefined) dbUpdate.is_favorite = patch.favorite
  if (patch.trashed !== undefined) dbUpdate.is_trashed = patch.trashed

  return dbUpdate
}
