import { type NextRequest } from "next/server"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/response"
import { isValidUuid, updateNoteSchema } from "@/lib/validations/note"
import { mapClientUpdateToDb, mapNoteRowToClient } from "@/lib/notes/mapper"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/notes/[id]
 * Retrieves a single note by ID for the authenticated owner.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required to view this note", 401)
    }

    const { id } = await params

    if (!isValidUuid(id)) {
      return apiError("INVALID_ID", "The provided note ID is not a valid UUID", 400)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error || !data) {
      return apiError("NOT_FOUND", "Note not found or inaccessible", 404)
    }

    return apiSuccess({ note: mapNoteRowToClient(data) })
  } catch (err) {
    console.error("[GET /api/notes/[id]] Unexpected error:", err)
    return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500)
  }
}

/**
 * PATCH /api/notes/[id]
 * Updates an existing note owned by the authenticated user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required to update this note", 401)
    }

    const { id } = await params

    if (!isValidUuid(id)) {
      return apiError("INVALID_ID", "The provided note ID is not a valid UUID", 400)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("INVALID_JSON", "Malformed or empty JSON body", 400)
    }

    const validation = updateNoteSchema.safeParse(body)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return apiError(
        "VALIDATION_ERROR",
        firstIssue?.message || "Validation failed for note update",
        400,
        validation.error.format()
      )
    }

    const supabase = await createClient()

    // Confirm the note exists and belongs to the user
    const { data: existing, error: checkError } = await supabase
      .from("notes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (checkError || !existing) {
      return apiError("NOT_FOUND", "Note not found or inaccessible", 404)
    }

    const dbUpdate = mapClientUpdateToDb(validation.data)

    const { data, error: updateError } = await supabase
      .from("notes")
      .update(dbUpdate)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError || !data) {
      console.error("[PATCH /api/notes/[id]] Database update error:", updateError?.message)
      return apiError("DATABASE_ERROR", "Failed to update note", 500)
    }

    return apiSuccess({ note: mapNoteRowToClient(data) })
  } catch (err) {
    console.error("[PATCH /api/notes/[id]] Unexpected error:", err)
    return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500)
  }
}

/**
 * DELETE /api/notes/[id]
 * Permanently deletes a note that has already been moved to Trash.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required to delete this note", 401)
    }

    const { id } = await params

    if (!isValidUuid(id)) {
      return apiError("INVALID_ID", "The provided note ID is not a valid UUID", 400)
    }

    const supabase = await createClient()

    // Verify note exists and check trashed status
    const { data: existing, error: checkError } = await supabase
      .from("notes")
      .select("id,is_trashed")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (checkError || !existing) {
      return apiError("NOT_FOUND", "Note not found or inaccessible", 404)
    }

    // Safety rule: Only permanently delete notes that are already in Trash
    if (!existing.is_trashed) {
      return apiError(
        "CONFLICT",
        "Note must be moved to Trash before it can be permanently deleted",
        409
      )
    }

    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("[DELETE /api/notes/[id]] Delete error:", deleteError.message)
      return apiError("DATABASE_ERROR", "Failed to delete note", 500)
    }

    return new Response(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/notes/[id]] Unexpected error:", err)
    return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500)
  }
}
