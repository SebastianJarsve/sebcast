// src/utils.ts
import { NewRequest, Headers } from "~/types";

/**
 * Parses a cURL command string and converts it into a NewRequest object.
 * This is a simplified parser designed to handle common cURL commands,
 * such as those copied from browser developer tools.
 * @param curl The raw cURL command string to parse.
 * @returns A NewRequest object, or null if parsing fails.
 */
export function parseCurlToRequest(curl: string): NewRequest | null {
  try {
    // The URL is typically the last argument that doesn't start with a hyphen.
    // This regex finds all quoted strings or standalone words.
    const urlMatch = curl.match(/'(https?:\/\/[^']+|[^']+)'|"(https?:\/\/[^"]+|[^"]+)"|(\S+)/g);
    const url = urlMatch?.find((u) => u.includes("http") || u.startsWith("'http"))?.replace(/['"]/g, "") ?? "";

    // Find the method flag (-X or --request) and capture the next word.
    const methodMatch = curl.match(/-X\s*(\w+)|--request\s*(\w+)/);
    const method = (methodMatch ? methodMatch[1] || methodMatch[2] : "GET").toUpperCase() as NewRequest["method"];

    // Find all header flags (-H) and their values. The 'g' flag finds all occurrences.
    const headers: Headers = [];
    const headerRegex = /-H\s*'([^']*)'|-H\s*"([^"]*)"/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(curl)) !== null) {
      const headerString = headerMatch[1] || headerMatch[2];
      const [key, ...valueParts] = headerString.split(": ");
      if (key) {
        headers.push({ key, value: valueParts.join(": ") });
      }
    }

    // Find the data payload, looking for --data or --data-raw.
    const bodyMatch = curl.match(/--data-raw\s*'([^']*)'|--data\s*'([^']*)'/);
    const body = bodyMatch ? bodyMatch[1] || bodyMatch[2] : undefined;
    const bodyType: "JSON" | "NONE" = body ? "JSON" : "NONE";

    // Separate the URL from its query parameters.
    let requestUrl = url;
    let params: string | undefined = undefined;
    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex + 1);
      requestUrl = url.substring(0, queryIndex);

      // Use the built-in URLSearchParams to correctly parse the query.
      const searchParams = new URLSearchParams(queryString);
      params = JSON.stringify(Object.fromEntries(searchParams.entries()));
    }

    // Assemble the final NewRequest object.
    const newRequest: NewRequest = {
      url: requestUrl,
      method,
      headers,
      body,
      bodyType,
      params: method === "GET" ? params : undefined,
    };

    return newRequest;
  } catch (error) {
    console.error("Failed to parse cURL command:", error);
    return null;
  }
}
