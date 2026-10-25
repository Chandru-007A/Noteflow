import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import type { Database } from "./types"

/**
 * Normalizes the Supabase URL by removing trailing REST endpoints or slashes.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "")
}

export function getSupabaseKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
}

/**
 * Creates a browser-side Supabase client for client components and hooks.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseKey())
}

// In-flight singleton promise to prevent duplicate anonymous session creation
let sessionInitPromise: Promise<User | null> | null = null

/**
 * Ensures that an authenticated session exists for the user.
 * If no session is present, signs in anonymously using Supabase Anonymous Auth.
 * Returns the verified user object, or null if session establishment fails.
 * Coordinated as a singleton promise across concurrent callers.
 */
export async function ensureAnonymousSession(): Promise<User | null> {
  if (sessionInitPromise) {
    return sessionInitPromise
  }

  sessionInitPromise = (async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (user && !userError) {
        return user
      }

      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error("[Auth] Failed to establish anonymous session:", error.message)
        return null
      }

      return data.user
    } catch (err) {
      console.error("[Auth] Unexpected error during session initialization:", err)
      return null
    } finally {
      // Clear in-flight promise after a brief interval so subsequent explicit calls can re-validate
      setTimeout(() => {
        sessionInitPromise = null
      }, 500)
    }
  })()

  return sessionInitPromise
}
