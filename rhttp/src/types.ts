import { Color } from "@raycast/api";
import { z } from "zod";

enum Methods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  GRAPHQL = "GRAPHQL",
}

enum MethodColor {
  GET = Color.Blue,
  POST = Color.Green,
  PUT = Color.Purple,
  PATCH = Color.Yellow,
  DELETE = Color.Red,
  GRAPHQL = Color.Orange,
}

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CookieOptions = {
  maxAge: number;
  expires?: Date;
  httpOnly: boolean;
  path: string;
  domain: string;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
};
type ParsedCookie = {
  cookieName: string;
  cookieValue: string;
  options: CookieOptions;
};
type Cookies = {
  [key: string]: ParsedCookie[];
};

export const headerKeys = [
  "A-IM",
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Accept-Datetime",
  "Access-Control-Request-Method",
  "Access-Control-Request-Headers",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Date",
  "Expect",
  "Forwarded",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Range",
  "If-Unmodified-Since",
  "Max-Forwards",
  "Origin",
  "Pragma",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "TE",
  "User-Agent",
  "Upgrade",
  "Via",
  "Warning",
  "Dnt",
  "X-Requested-With",
  "X-CSRF-Token",
] as const;

export const headerKeysEnum = z.enum(headerKeys);

export const headersSchema = z.array(z.object({ key: z.string().optional(), value: z.string() })).default([]);
export type Headers = z.infer<typeof headersSchema>;
export const headersObjectSchema = z.record(z.string(), z.string());
export type HeadersObject = z.infer<typeof headersObjectSchema>;

const requestSchema = z.object({
  id: z.string().uuid(),
  method: z.nativeEnum(Methods),
  title: z.string().optional(),
  url: z.string().url(),
  body: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) return;
      try {
        JSON.stringify(value);
      } catch (e) {
        ctx.addIssue({ code: "custom", message: "Must be a valid json string" });
      }
    }),
  params: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) return;
      try {
        JSON.stringify(value);
      } catch (e) {
        ctx.addIssue({ code: "custom", message: "Must be a valid json string" });
      }
    }),

  variables: z
    .string()
    .optional()
    .refine((val) => {
      try {
        if (val === undefined) return false;
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    }),
  query: z.string().optional(),

  headers: headersSchema,
});

const newRequestSchema = requestSchema.omit({ id: true });

const collectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  baseUrl: z.string().url(),
  requests: z.array(requestSchema),
  headers: headersSchema,
});

const newCollectionSchema = collectionSchema;

type Request = z.infer<typeof requestSchema>;
type Collection = z.infer<typeof collectionSchema>;
type NewRequest = z.infer<typeof newRequestSchema>;
type NewCollection = z.infer<typeof newCollectionSchema>;

export type { Collection, Color, CookieOptions, Cookies, NewCollection, NewRequest, ParsedCookie, PartialBy, Request };

export { MethodColor, Methods };
