// src/utils.ts
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import https from "https";
import { Collection, Request, ParsedCookie, parsedCookieSchema, NewRequest } from "./types";
import { $cookies, addParsedCookie } from "./cookies";
import { $currentEnvironmentId, $environments, saveVariableToActiveEnvironment } from "./environments";

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

      // --- THIS CHECK IS CRUCIAL ---
      // Only try to add the cookie if parsing was successful and returned a valid object.
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
export async function runRequest(request: NewRequest, collection: Collection) {
  const variables = resolveVariables();

  const baseUrl = variables.baseUrl; // Get baseUrl from the environment
  const requestUrl = substitutePlaceholders(request.url, variables) ?? "";

  let finalUrl = requestUrl;
  // If the path is relative, combine it with the baseUrl from the environment
  if (requestUrl === undefined || requestUrl.length === 0) {
    finalUrl = baseUrl;
  } else if (requestUrl?.startsWith("/") && baseUrl) {
    finalUrl = `${baseUrl.replace(/\/$/, "")}${requestUrl}`;
  }
  const finalHeaders =
    request.headers?.map(({ key, value }) => ({
      key: substitutePlaceholders(key, variables) ?? "",
      value: substitutePlaceholders(value, variables) ?? "",
    })) ?? [];
  const finalBody = substitutePlaceholders(request.body, variables);
  const finalParams = substitutePlaceholders(request.params, variables);
  const finalGqlQuery = substitutePlaceholders(request.query, variables);
  const finalGqlVariables = substitutePlaceholders(request.variables, variables);

  const cookieHeader = prepareCookieHeader(finalUrl);
  const mergedHeaders = {
    ...headersArrayToObject(collection.headers),
    ...headersArrayToObject(finalHeaders),
    ...cookieHeader,
  };

  try {
    const config: AxiosRequestConfig = {
      url: finalUrl,
      headers: mergedHeaders,
      method: request.method === "GRAPHQL" ? "POST" : request.method,

      // 2. NOW, parse the substituted strings as JSON
      params: finalParams ? JSON.parse(finalParams) : undefined,
      data: finalBody ? JSON.parse(finalBody) : undefined,

      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    };

    if (request.bodyType === "FORM_DATA" && finalBody) {
      const formData = new FormData();

      // First, parse the JSON string from the body into an object
      const dataObject: Record<string, string> = JSON.parse(finalBody);

      // Then, loop through the object and append to FormData
      for (const [key, value] of Object.entries(dataObject)) {
        formData.append(key, value);
      }

      config.data = formData;
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["Content-Type"];
      }
    }

    if (request.method === "GRAPHQL") {
      config.data = {
        query: finalGqlQuery,
        variables: finalGqlVariables ? JSON.parse(finalGqlVariables) : undefined,
      };
    }
    const response = await axios(config);
    handleSetCookieHeaders(response);

    if (request.responseActions) {
      for (const action of request.responseActions) {
        let extractedValue: unknown;

        if (action.source === "BODY_JSON") {
          // Use `get` to safely access a value from a nested path
          extractedValue = getValueByPath(response.data, action.sourcePath);
        } else if (action.source === "HEADER") {
          extractedValue = response.headers[action.sourcePath.toLowerCase()];
        }
        console.log("EXTRACTED VALUE", extractedValue);

        if (typeof extractedValue === "string" || typeof extractedValue === "number") {
          saveVariableToActiveEnvironment(action.variableKey, String(extractedValue));
        }
      }
    }
    return response;
  } catch (error) {
    // If JSON.parse fails on a malformed body (e.g. missing comma), it will be caught here.
    if (axios.isAxiosError(error) && error.response) {
      handleSetCookieHeaders(error.response);
    }
    throw error;
  }
}

/**
 * Builds the final, resolved map of variables for the active environment,
 * giving the active environment's variables precedence over Globals.
 */
export function resolveVariables(): Record<string, string> {
  const allEnvironments = $environments.get();
  const activeId = $currentEnvironmentId.get();

  const globalEnv = allEnvironments.find((e) => e.name === "Globals");
  const activeEnv = allEnvironments.find((e) => e.id === activeId);

  const resolved: Record<string, string> = {};

  // 1. Add all global variables first.
  if (globalEnv) {
    for (const [key, variable] of Object.entries(globalEnv.variables)) {
      resolved[key] = variable.value;
    }
  }

  // 2. Add active environment variables, overwriting globals with the same key.
  if (activeEnv) {
    for (const [key, variable] of Object.entries(activeEnv.variables)) {
      resolved[key] = variable.value;
    }
  }

  return resolved;
}

/**
 * Replaces all {{...}} placeholders in a string with values from a variables object.
 * Safely handles undefined input.
 */
function substitutePlaceholders(input: string | undefined, variables: Record<string, string>): string | undefined {
  // If the input is undefined, just return undefined right away.
  if (!input) {
    return undefined;
  }

  return input.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Safely gets a nested value from an object using a path string.
 * @param obj The object to search.
 * @param path The path string (e.g., "user.address.city").
 * @returns The found value or undefined if the path is invalid.
 */
export function getValueByPath(obj: any, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    // Use optional chaining to safely access nested properties
    return current?.[key];
  }, obj);
}
