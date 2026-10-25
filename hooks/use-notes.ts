"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ensureAnonymousSession } from "@/lib/supabase/client"
import { notesApi, NotesApiError } from "@/lib/api/notes"
import type { ClientNote } from "@/lib/notes/mapper"
import type { CreateNoteInput, UpdateNoteInput } from "@/lib/validations/note"
import { toast } from "sonner"

const LEGACY_STORAGE_KEY = "noteflow-notes"
const MIGRATION_RECORD_KEY = "noteflow-legacy-migrated"

interface LegacyNote {
  id?: string
  title?: string
  content?: string
  tags?: string[]
  color?: string
  pinned?: boolean
  favorite?: boolean
  trashed?: boolean
}

export function useNotes() {
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initializedRef = useRef(false)

  /**
   * Performs safe, one-time migration of legacy localStorage notes if the server workspace is empty.
   */
  const migrateLegacyNotesIfEligible = useCallback(async (currentServerNotes: ClientNote[]): Promise<ClientNote[]> => {
    if (typeof window === "undefined") return currentServerNotes

    const alreadyMigrated = window.localStorage.getItem(MIGRATION_RECORD_KEY) === "true"
    if (alreadyMigrated) return currentServerNotes

    // Only migrate if server has 0 notes
    if (currentServerNotes.length > 0) {
      window.localStorage.setItem(MIGRATION_RECORD_KEY, "true")
      return currentServerNotes
    }

    const rawStored = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!rawStored) {
      window.localStorage.setItem(MIGRATION_RECORD_KEY, "true")
      return currentServerNotes
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawStored)
    } catch {
      console.warn("[Migration] Legacy local storage data was malformed JSON; skipping migration.")
      window.localStorage.setItem(MIGRATION_RECORD_KEY, "true")
      return currentServerNotes
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(MIGRATION_RECORD_KEY, "true")
      return currentServerNotes
    }

    const legacyList = parsed as LegacyNote[]
    const validNotes = legacyList.filter(
      (item) => typeof item.title === "string" && item.title.trim().length > 0
    )

    if (validNotes.length === 0) {
      window.localStorage.setItem(MIGRATION_RECORD_KEY, "true")
      return currentServerNotes
    }

    toast.info(`Importing ${validNotes.length} existing notes into your cloud workspace...`)

    const importedNotes: ClientNote[] = []
    let failureCount = 0

    for (const legacy of validNotes) {
      try {
        const createPayload: CreateNoteInput = {
          title: legacy.title!.trim(),
          content: typeof legacy.content === "string" ? legacy.content : "",
          tags: Array.isArray(legacy.tags) ? legacy.tags : [],
          color: (["violet", "amber", "blue", "emerald", "rose", "slate"].includes(legacy.color || "")
            ? legacy.color
            : "violet") as CreateNoteInput["color"],
          pinned: Boolean(legacy.pinned),
          favorite: Boolean(legacy.favorite),
        }

        let created = await notesApi.createNote(createPayload)

        // If the legacy note was in Trash, patch its trashed status
        if (legacy.trashed) {
          created = await notesApi.trashNote(created.id)
        }

        importedNotes.push(created)
      } catch (importErr) {
        console.error("[Migration] Failed to import note:", legacy.title, importErr)
        failureCount++
      }
    }

    if (failureCount === 0) {
      // Mark migration as successful; retain localStorage as recovery copy
      window.localStorage.setItem(MIGRATION_RECORD_KEY, "true")
      toast.success(`Successfully migrated ${importedNotes.length} notes to your cloud workspace.`)
      return importedNotes
    } else {
      toast.error(`Migrated ${importedNotes.length} notes, but ${failureCount} failed. Local backup preserved.`)
      // Do not set MIGRATION_RECORD_KEY to true so retry remains possible
      return importedNotes
    }
  }, [])

  /**
   * Initializes session and fetches notes from the backend API.
   */
  const initializeAndLoad = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setAuthError(null)

    try {
      const user = await ensureAnonymousSession()
      if (!user) {
        setAuthError("Failed to initialize a secure session. Please check your network and try again.")
        setIsLoading(false)
        return
      }

      // Fetch notes from server
      let fetched = await notesApi.listNotes()

      // Check for one-time legacy migration
      fetched = await migrateLegacyNotesIfEligible(fetched)

      setNotes(fetched)
    } catch (err) {
      console.error("[useNotes] Load error:", err)
      if (err instanceof NotesApiError) {
        setError(err.message)
      } else {
        setError("Failed to load notes from the server.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [migrateLegacyNotesIfEligible])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      initializeAndLoad()
    }
  }, [initializeAndLoad])

  /**
   * Create Note
   */
  const createNote = useCallback(async (draft: CreateNoteInput): Promise<ClientNote | null> => {
    setIsMutating(true)
    try {
      const created = await notesApi.createNote(draft)
      setNotes((current) => [created, ...current])
      toast.success("Note created")
      return created
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to create note"
      toast.error(message)
      return null
    } finally {
      setIsMutating(false)
    }
  }, [])

  /**
   * Edit Note
   */
  const editNote = useCallback(async (id: string, patch: UpdateNoteInput): Promise<ClientNote | null> => {
    setIsMutating(true)
    try {
      const updated = await notesApi.updateNote(id, patch)
      setNotes((current) => current.map((n) => (n.id === id ? updated : n)))
      toast.success("Note updated")
      return updated
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to update note"
      toast.error(message)
      return null
    } finally {
      setIsMutating(false)
    }
  }, [])

  /**
   * Toggle Pin Status
   */
  const togglePin = useCallback(async (id: string): Promise<boolean> => {
    const target = notes.find((n) => n.id === id)
    if (!target) return false

    const nextPinned = !target.pinned
    try {
      const updated = await notesApi.updateNote(id, { pinned: nextPinned })
      setNotes((current) => current.map((n) => (n.id === id ? updated : n)))
      toast.success(nextPinned ? "Note pinned" : "Note unpinned")
      return true
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to update pin status"
      toast.error(message)
      return false
    }
  }, [notes])

  /**
   * Toggle Favorite Status
   */
  const toggleFavorite = useCallback(async (id: string): Promise<boolean> => {
    const target = notes.find((n) => n.id === id)
    if (!target) return false

    const nextFavorite = !target.favorite
    try {
      const updated = await notesApi.updateNote(id, { favorite: nextFavorite })
      setNotes((current) => current.map((n) => (n.id === id ? updated : n)))
      toast.success(nextFavorite ? "Added to favorites" : "Removed from favorites")
      return true
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to update favorite status"
      toast.error(message)
      return false
    }
  }, [notes])

  /**
   * Move Note to Trash (Soft Delete)
   */
  const trashNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await notesApi.trashNote(id)
      setNotes((current) => current.map((n) => (n.id === id ? updated : n)))
      toast.success("Note moved to trash")
      return true
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to move note to trash"
      toast.error(message)
      return false
    }
  }, [])

  /**
   * Restore Note from Trash
   */
  const restoreNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await notesApi.restoreNote(id)
      setNotes((current) => current.map((n) => (n.id === id ? updated : n)))
      toast.success("Note restored")
      return true
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to restore note"
      toast.error(message)
      return false
    }
  }, [])

  /**
   * Permanently Delete Note (Hard Delete)
   */
  const permanentDeleteNote = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true)
    try {
      await notesApi.deleteNote(id)
      setNotes((current) => current.filter((n) => n.id !== id))
      toast.success("Note permanently deleted")
      return true
    } catch (err) {
      const message = err instanceof NotesApiError ? err.message : "Failed to permanently delete note"
      toast.error(message)
      return false
    } finally {
      setIsMutating(false)
    }
  }, [])

  /**
   * Manual refresh
   */
  const refreshNotes = useCallback(async () => {
    try {
      const fetched = await notesApi.listNotes()
      setNotes(fetched)
    } catch (err) {
      console.error("[useNotes] Refresh error:", err)
      toast.error("Failed to refresh notes from server")
    }
  }, [])

  return {
    notes,
    isLoading,
    isMutating,
    authError,
    error,
    createNote,
    editNote,
    togglePin,
    toggleFavorite,
    trashNote,
    restoreNote,
    permanentDeleteNote,
    refreshNotes,
    retry: initializeAndLoad,
  }
}
