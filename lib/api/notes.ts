import type { ClientNote } from "@/lib/notes/mapper"
import type {
  CreateNoteInput,
  NotesQueryInput,
  UpdateNoteInput,
} from "@/lib/validations/note"

export class NotesApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = "NotesApiError"
  }
}

/**
 * Generic request helper targeting same-origin Next.js Route Handlers.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })
  } catch (netErr) {
    throw new NotesApiError(
      "NETWORK_ERROR",
      "Unable to connect to the server. Please check your network connection.",
      0,
      netErr
    )
  }

  let data: any
  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    try {
      data = await response.json()
    } catch {
      throw new NotesApiError(
        "INVALID_JSON",
        "Received an unparseable response from the server.",
        response.status
      )
    }
  } else {
    data = null
  }

  if (!response.ok) {
    const errorPayload = data?.error
    const code = errorPayload?.code || `HTTP_${response.status}`
    const message = errorPayload?.message || response.statusText || "An unexpected error occurred"
    const details = errorPayload?.details

    throw new NotesApiError(code, message, response.status, details)
  }

  return data as T
}

/**
 * Notes REST API client.
 */
export const notesApi = {
  /**
   * Retrieves notes for the authenticated user, optionally filtered or sorted.
   */
  async listNotes(query?: Partial<NotesQueryInput>): Promise<ClientNote[]> {
    const searchParams = new URLSearchParams()
    if (query?.view) searchParams.set("view", query.view)
    if (query?.tag) searchParams.set("tag", query.tag)
    if (query?.search) searchParams.set("search", query.search)
    if (query?.sort) searchParams.set("sort", query.sort)

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/api/notes?${queryString}` : "/api/notes"

    const result = await request<{ notes: ClientNote[] }>(endpoint, {
      method: "GET",
    })

    if (!result || !Array.isArray(result.notes)) {
      throw new NotesApiError(
        "INVALID_RESPONSE",
        "Server returned an invalid notes list structure.",
        200
      )
    }

    return result.notes
  },

  /**
   * Creates a new note.
   */
  async createNote(payload: CreateNoteInput): Promise<ClientNote> {
    const result = await request<{ note: ClientNote }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (!result || !result.note || !result.note.id) {
      throw new NotesApiError(
        "INVALID_RESPONSE",
        "Server returned an invalid note creation response.",
        201
      )
    }

    return result.note
  },

  /**
   * Retrieves a single note by ID.
   */
  async getNote(id: string): Promise<ClientNote> {
    const result = await request<{ note: ClientNote }>(`/api/notes/${id}`, {
      method: "GET",
    })

    if (!result || !result.note || !result.note.id) {
      throw new NotesApiError(
        "INVALID_RESPONSE",
        "Server returned an invalid note response.",
        200
      )
    }

    return result.note
  },

  /**
   * Updates an existing note.
   */
  async updateNote(id: string, patch: UpdateNoteInput): Promise<ClientNote> {
    const result = await request<{ note: ClientNote }>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })

    if (!result || !result.note || !result.note.id) {
      throw new NotesApiError(
        "INVALID_RESPONSE",
        "Server returned an invalid note update response.",
        200
      )
    }

    return result.note
  },

  /**
   * Moves a note to Trash (soft delete).
   */
  async trashNote(id: string): Promise<ClientNote> {
    return this.updateNote(id, { trashed: true })
  },

  /**
   * Restores a note from Trash.
   */
  async restoreNote(id: string): Promise<ClientNote> {
    return this.updateNote(id, { trashed: false })
  },

  /**
   * Permanently deletes a note that is in Trash.
   */
  async deleteNote(id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/notes/${id}`, {
      method: "DELETE",
    })
  },
}
