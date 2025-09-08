import { Color } from "@raycast/api";

export const MAX_JSON_LENGTH = 30000;

export const COMMON_HEADER_KEYS = [
  "A-IM",
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Date",
  "Expect",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "Origin",
  "Pragma",
  "Range",
  "Referer",
  "TE",
  "User-Agent",
  "X-CSRF-Token",
  "X-Requested-With",
] as const;

// --- CONSTANTS AND ENUMS ---

/**
 * Defines HTTP methods and their associated colors.
 * This centralizes the configuration for each method.
 */
export const METHODS = {
  GET: { color: Color.Blue },
  POST: { color: Color.Green },
  PUT: { color: Color.Purple },
  PATCH: { color: Color.Yellow },
  DELETE: { color: Color.Red },
  GRAPHQL: { color: Color.Orange },
} as const;
