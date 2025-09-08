// src/utils.ts
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import https from "https";
import { Collection, Request, ParsedCookie, parsedCookieSchema, Cookies } from "./types";
import { $cookies, addParsedCookie } from "./cookies"; // Import our new cookie store
import { $secrets } from "./secrets";

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

const headersArrayToObject = (headers: { key: string; value: string }[]) => {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
};

// --- COOKIE HELPERS ---

/**
 * Gathers all relevant cookies from the store for an outgoing request.
 * @param finalUrl The full URL of the request.
 * @returns An object with a formatted `Cookie` header, or undefined if no cookies match.
 */
function prepareCookieHeader(finalUrl: string): { Cookie: string } | undefined {
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
function handleSetCookieHeaders(response: AxiosResponse) {
  const setCookieHeader = response.headers["set-cookie"];
  if (setCookieHeader) {
    const rawCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const rawCookie of rawCookies) {
      const parsed = parseCookie(rawCookie);
      if (parsed) {
        addParsedCookie(parsed);
      }
    }
  }
}

// --- MAIN REQUEST FUNCTION ---

/**
 * The single, powerful function to execute a request.
 */
export async function runRequest(request: Request | Omit<Request, "id">, collection: Collection) {
  console.log(request);
  const finalUrl = constructUrl(collection, request);
  const cookieHeader = prepareCookieHeader(finalUrl);

  const mergedHeaders = {
    ...headersArrayToObject(collection.headers),
    ...headersArrayToObject(request.headers),
    ...cookieHeader,
  };

  const config: AxiosRequestConfig = {
    url: finalUrl,
    headers: mergedHeaders,
    method: request.method === "GRAPHQL" ? "POST" : request.method,
    params: request.params ? JSON.parse(request.params) : undefined,
    data: request.body ? JSON.parse(request.body) : undefined,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  };

  if (request.method === "GRAPHQL") {
    config.data = {
      query: request.query,
      variables: request.variables ? JSON.parse(request.variables) : undefined,
    };
  }

  const response = await axios(config);
  handleSetCookieHeaders(response);

  return response;
}

/**
 * Constructs a full URL based on a simple rule:
 *
 * - If the request's URL starts with "/", it's combined with the collection's baseUrl.
 * - Otherwise, the request's URL is used as-is, assuming it's a full URL.
 *
 * @param collection The collection object, which may have a `baseUrl`.
 * @param request The request object.
 * @returns The final URL as a string.
 */
export function constructUrl(collection: Collection, request: Omit<Request, "id" | "headers">): string {
  const { baseUrl } = collection;
  const { url: requestUrl } = request;

  // Rule: If the request URL is a relative path, use the base URL.
  if (requestUrl.startsWith("/")) {
    if (baseUrl) {
      // Combine them, removing any trailing slash from the baseUrl to prevent doubles.
      // e.g., "https://api.com/" + "/users" -> "https://api.com/users"
      return `${baseUrl.replace(/\/$/, "")}${requestUrl}`;
    }
    // If there's no baseUrl, a relative path is incomplete, but we return it as-is.
    return requestUrl;
  }

  // Otherwise, the request URL is treated as an absolute URL.
  return requestUrl;
}

/**
 * Replaces all {{...}} placeholders in a string with values from a secrets object.
 * @param input The string to process (e.g., a URL or header value).
 * @param secrets A record of secret keys and their values.
 * @returns The processed string with placeholders replaced.
 */
export function substitutePlaceholders(input: string, secrets: Record<string, string>): string {
  if (!input) return "";

  // This regex finds all instances of {{variable_name}}
  return input.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    // If the secret is found, return its value. Otherwise, return the original placeholder.
    return secrets[key] || match;
  });
}

/**
 * Builds the final, resolved map of secrets for a given collection,
 * giving collection-scoped secrets precedence over global ones.
 */
export function resolveSecretsForCollection(collectionId: string): Record<string, string> {
  const allSecrets = $secrets.get();
  const resolved: Record<string, string> = {};

  // 1. Add all global secrets first.
  for (const secret of allSecrets) {
    if (secret.scope === "global") {
      resolved[secret.key] = secret.value;
    }
  }

  // 2. Add collection-specific secrets, overwriting any global ones.
  for (const secret of allSecrets) {
    if (secret.scope === "collection" && secret.collectionId === collectionId) {
      resolved[secret.key] = secret.value;
    }
  }

  return resolved;
}
