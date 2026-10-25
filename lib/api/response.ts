import { NextResponse } from "next/server"

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

/**
 * Standardized success response helper with anti-caching headers.
 */
export function apiSuccess<T>(data: T, status = 200, customHeaders?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      ...NO_CACHE_HEADERS,
      ...customHeaders,
    },
  })
}

/**
 * Standardized error response helper with anti-caching headers.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  }

  return NextResponse.json(body, {
    status,
    headers: NO_CACHE_HEADERS,
  })
}
