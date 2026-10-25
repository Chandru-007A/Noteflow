import { type NextRequest } from "next/server"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/response"
import {
  createNoteSchema,
  notesQuerySchema,
} from "@/lib/validations/note"
import { mapNoteRowToClient } from "@/lib/notes/mapper"
import type { NoteInsert } from "@/lib/supabase/types"

/**
 * GET /api/notes
 * Retrieves notes for the authenticated user based on query parameters.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required to view notes", 401)
    }

    const { searchParams } = new URL(request.url)
    const rawQuery = {
      view: searchParams.get("view") || "all",
      tag: searchParams.get("tag") || undefined,
      search: searchParams.get("search") || undefined,
      sort: searchParams.get("sort") || "edited",
    }

    const queryValidation = notesQuerySchema.safeParse(rawQuery)
    if (!queryValidation.success) {
      return apiError(
        "INVALID_QUERY",
        queryValidation.error.issues[0]?.message || "Invalid query parameters",
        400
      )
    }

    const { view, tag, search, sort } = queryValidation.data
    const supabase = await createClient()

    let query = supabase.from("notes").select("*").eq("user_id", user.id)

    // Apply view filters
    switch (view) {
      case "trash":
        query = query.eq("is_trashed", true)
        break
      case "pinned":
        query = query.eq("is_trashed", false).eq("is_pinned", true)
        break
      case "recent": {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.eq("is_trashed", false).gte("updated_at", sevenDaysAgo)
        break
      }
      case "favorites":
        query = query.eq("is_trashed", false).eq("is_favorite", true)
        break
      case "all":
      default:
        query = query.eq("is_trashed", false)
        break
    }

    // Apply tag filter
    if (tag) {
      const normalizedTag = tag.trim().toLowerCase()
      if (normalizedTag.length > 0) {
        query = query.contains("tags", [normalizedTag])
      }
    }

    // Apply safe search filter
    if (search) {
      // Sanitize input to remove PostgREST operator punctuation
      const cleanSearch = search.replace(/[,:()"\\]/g, " ").trim()
      if (cleanSearch.length > 0) {
        query = query.or(
          `title.ilike.%${cleanSearch}%,content.ilike.%${cleanSearch}%`
        )
      }
    }

    // Apply sorting
    switch (sort) {
      case "title":
        query = query.order("title", { ascending: true })
        break
      case "created":
        query = query.order("created_at", { ascending: false })
        break
      case "edited":
      default:
        query = query.order("updated_at", { ascending: false })
        break
    }

    const { data, error } = await query

    if (error) {
      console.error("[GET /api/notes] Database error:", error.message)
      return apiError("DATABASE_ERROR", "Failed to retrieve notes", 500)
    }

    const notes = (data || []).map(mapNoteRowToClient)
    return apiSuccess({ notes })
  } catch (err) {
    console.error("[GET /api/notes] Unexpected server error:", err)
    return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500)
  }
}

/**
 * POST /api/notes
 * Creates a new note for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required to create a note", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("INVALID_JSON", "Malformed or empty JSON body", 400)
    }

    const validation = createNoteSchema.safeParse(body)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return apiError(
        "VALIDATION_ERROR",
        firstIssue?.message || "Validation failed for note creation",
        400,
        validation.error.format()
      )
    }

    const input = validation.data
    const supabase = await createClient()

    const insertPayload: NoteInsert = {
      user_id: user.id,
      title: input.title,
      content: input.content,
      tags: input.tags,
      color: input.color,
      is_pinned: input.pinned,
      is_favorite: input.favorite,
      is_trashed: false,
    }

    const { data, error } = await supabase
      .from("notes")
      .insert(insertPayload)
      .select()
      .single()

    if (error || !data) {
      console.error("[POST /api/notes] Database error:", error?.message)
      return apiError("DATABASE_ERROR", "Failed to create note", 500)
    }

    return apiSuccess({ note: mapNoteRowToClient(data) }, 201)
  } catch (err) {
    console.error("[POST /api/notes] Unexpected server error:", err)
    return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500)
  }
}
