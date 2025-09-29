import { AxiosResponse } from "axios";
import { $cookies, addParsedCookie } from "~/store/cookies";
import { ParsedCookie, parsedCookieSchema } from "~/types";

/**
 * Parses a raw "Set-Cookie" header string into our structured ParsedCookie type.
 * Uses Zod to validate the final object.
 */
export function parseCookie(rawCookie: string): ParsedCookie | null {
  try {
    const parts = rawCookie.split(";").map((part) => part.trim());
    const [name, value] = parts.shift()!.split("="); // Get the name/value pair

    const options: Record<string, string | boolean> = {};
    for (const part of parts) {
      let [key, val] = part.split("=");
      // Normalize key to lowercase to easily find it
      key = key.toLowerCase();
      // If there's no value, it's a flag like "HttpOnly"
      options[key] = val === undefined ? true : val;
    }

    const cookieObject = {
      cookieName: name,
      cookieValue: value,
      options: {
        maxAge: options["max-age"] ? parseInt(String(options["max-age"])) : undefined,
        expires: options.expires ? new Date(String(options.expires)) : undefined,
        httpOnly: !!options.httponly,
        path: String(options.path ?? "/"), // Default path is typically "/"
        domain: String(options.domain),
        secure: !!options.secure,
        sameSite: options.samesite,
      },
    };

    // Use our schema to validate and return the final, typed object.
    return parsedCookieSchema.parse(cookieObject);
  } catch (error) {
    console.error("Failed to parse cookie:", rawCookie, error);
    return null;
  }
}

/**
 * Gathers all relevant cookies from the store for an outgoing request.
 * @param finalUrl The full URL of the request.
 * @returns An object with a formatted `Cookie` header, or undefined if no cookies match.
 */
export function prepareCookieHeader(finalUrl: string): { Cookie: string } | undefined {
  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    return undefined;
  }
  const allCookies = $cookies.get();
  const requestDomain = new URL(finalUrl).hostname;
  let cookieString = "";

  for (const domain in allCookies) {
    if (requestDomain.endsWith(domain)) {
      allCookies[domain].forEach((cookie) => {
        cookieString += `${cookie.cookieName}=${cookie.cookieValue}; `;
      });
    }
  }

  if (!cookieString) return undefined;
  return { Cookie: cookieString.slice(0, -2) };
}

/**
 * Finds, parses, and saves any `Set-Cookie` headers from an API response.
 * @param response The response object from an Axios request.
 */
export function handleSetCookieHeaders(response: AxiosResponse) {
  const setCookieHeader = response.headers["set-cookie"];
  if (setCookieHeader) {
    const rawCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const rawCookie of rawCookies) {
      const parsed = parseCookie(rawCookie);

      // --- THIS CHECK IS CRUCIAL ---
      // Only try to add the cookie if parsing was successful and returned a valid object.
      if (parsed) {
        addParsedCookie(parsed);
      }
    }
  }
}
