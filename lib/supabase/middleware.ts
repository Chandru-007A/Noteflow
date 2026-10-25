import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseUrl, getSupabaseKey } from "./client"
import type { Database } from "./types"

/**
 * Refreshes Supabase auth tokens and sets updated cookies on both request and response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseKey()

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  // Refreshing the auth token:
  await supabase.auth.getUser()

  return supabaseResponse
}
