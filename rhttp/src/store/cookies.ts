// src/store/cookies.ts
import { persistentAtom } from "@sebastianjarsve/persistent-atom";
import { cookiesSchema, Cookies, ParsedCookie } from "../types";
import { createRaycastFileAdapter } from "../lib/adapters";

export const $cookies = persistentAtom<Cookies>(
  {},
  {
    storage: createRaycastFileAdapter("cookies.json"),
    key: "cookies",
    serialize: (data) => JSON.stringify(cookiesSchema.parse(data)),
    deserialize: (raw) => cookiesSchema.parse(JSON.parse(raw)),
  },
);

/**
 * An action to add a parsed cookie to the store.
 */
export function addParsedCookie(cookie: ParsedCookie) {
  const allCookies = $cookies.get();
  const domain = cookie.options.domain;

  if (!domain) return; // Cannot save a cookie without a domain

  const domainCookies = allCookies[domain] ?? [];

  // Remove any existing cookie with the same name before adding the new one
  const newDomainCookies = domainCookies.filter((c) => c.cookieName !== cookie.cookieName);
  newDomainCookies.push(cookie);

  cookiesSchema.parse(allCookies);

  // Update the store
  $cookies.set({
    ...allCookies,
    [domain]: newDomainCookies,
  });
}
