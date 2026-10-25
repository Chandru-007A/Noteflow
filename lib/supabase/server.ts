import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseUrl, getSupabaseKey } from "./client"
import type { Database } from "./types"

/**
 * Creates a server-side Supabase client for Server Components, Server Actions,
 * and Next.js Route Handlers. Cookie-aware and compatible with Next.js 15.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware is refreshing user sessions.
        }
      },
    },
  })
}

/**
 * Validates and retrieves the authenticated user from the request cookies.
 * Uses `auth.getUser()` rather than `auth.getSession()` to guarantee
 * cryptographic verification with Supabase Auth servers.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}
