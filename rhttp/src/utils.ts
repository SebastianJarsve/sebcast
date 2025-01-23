import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Store } from ".";
import { Collection, CookieOptions, Cookies, Headers, HeadersObject, Methods, ParsedCookie, Request } from "./types";
import Axios from "axios";
import { MAX_JSON_LENGTH } from "./constants";

export function parseCookie(rawCookie: string) {
  if (!rawCookie.includes("=")) throw new Error("Invalid cookie format");
  const cookieParts = rawCookie.split(";").map((part) => part.trim());
  const [cookieKeyValue, ...cookieOptions] = cookieParts;
  const [cookieName, cookieValue] = cookieKeyValue.split("=");
  const cookie: ParsedCookie = { cookieName, cookieValue, options: {} as CookieOptions };
  cookieOptions.forEach((option) => {
    const [key, value] = option.split("=");
    switch (key.toLowerCase()) {
      case "max-age":
        cookie.options.maxAge = parseInt(value);
        break;
      case "httponly":
        cookie.options.httpOnly = true;
        break;
      case "path":
        cookie.options.path = value;
        break;
      case "domain":
        cookie.options.domain = value;
        break;
      case "expires":
        cookie.options.expires = new Date(value);
        break;
      case "secure":
        cookie.options.secure = true;
        break;
      case "samesite":
        cookie.options.sameSite = value.toLowerCase() === "none" ? "none" : (value.toLowerCase() as "lax" | "strict");
        break;
    }
  });
  return cookie;
}

export function generateRequestCookies(cookies: Cookies | undefined, url: string) {
  if (cookies === undefined) return [];
  const cookieKeys = Object.keys(cookies);
  const includedCookies: ParsedCookie[] = cookieKeys.reduce((acc, curr) => {
    if (url.startsWith(curr)) {
      const pathCookies = cookies?.[curr];
      if (pathCookies) {
        pathCookies.forEach((c) => acc.push(c));
      }
    }
    return acc;
  }, [] as ParsedCookie[]);
  return includedCookies;
}

export function buildHeadersObject(...headerArrays: Headers[]) {
  return headerArrays.reduce((acc, curr) => {
    curr?.forEach(({ key, value }) => {
      if (key) acc[key] = value;
    });
    return acc;
  }, {} as HeadersObject);
}

export function mdJson(object: unknown) {
  try {
    const code = JSON.stringify(object, null, 2);
    if (code.length > MAX_JSON_LENGTH) return JSON.stringify(object); // If code is very large, return regular text instead of a codeblock
    return "```json\n" + code.slice(0, Math.min(MAX_JSON_LENGTH, code.length)) + "\n```\n";
  } catch {
    return "undefined";
  }
}

export async function runRequest(req: Request, store: Store) {
  const { cookies, currentCollectionId, collections } = store;
  const collection = collections.value?.find((c) => c.id === currentCollectionId.value);
  const reqCookies = generateRequestCookies(cookies.value, collection?.baseUrl + req.url);
  const cookiesString = reqCookies?.reduce((acc, curr) => {
    acc += `${curr.cookieName}=${curr.cookieValue}; `;
    return acc;
  }, "");
  const cookieHeader = cookiesString
    ? {
        Cookie: cookiesString,
      }
    : undefined;

  const reqHeaders: { [key: string]: any } = {
    ...cookieHeader,
    ...buildHeadersObject(req.headers, collection?.headers ?? []),
  };

  const config: AxiosRequestConfig = {
    baseURL: collection?.baseUrl,
    url: req.url,
    headers: reqHeaders,
    data: (req.body && JSON.parse(req?.body)) || undefined,
    method: req.method === Methods.GRAPHQL ? Methods.POST : req.method,
  };

  if (req.params) config.params = JSON.parse(req.params);
  if (req.method === Methods.GRAPHQL) {
    config.data = {
      query: req.query,
      variables: req.variables && JSON.parse(req.variables),
    };
  }

  try {
    const response = await axios.request(config);
    return response;
  } catch (e) {
    const err = e as AxiosError;
    console.log(JSON.stringify(err, null, 2));
    return err.response;
  }
}
