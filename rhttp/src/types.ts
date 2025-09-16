import { z } from "zod";
import { METHODS } from "./constants";

/** Zod schema for validating that a string is one of the defined methods. */
export const methodSchema = z.enum(Object.keys(METHODS) as [keyof typeof METHODS, ...(keyof typeof METHODS)[]]);
export type Method = z.infer<typeof methodSchema>;

// --- GENERIC UTILITY TYPES ---

/** A utility type that makes specific keys (K) of a type (T) optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// --- REUSABLE ZOD SCHEMAS ---

/**
 * A reusable Zod schema for validating that a string contains valid JSON.
 * It uses `superRefine` for precise error messages.
 */
const jsonStringSchema = z
  .string()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return; // Allows for an empty or undefined string.
    try {
      JSON.parse(value);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: "Must be a valid JSON string" });
    }
  });

/** Schema for a single HTTP header (key/value pair). */
export const headerSchema = z.object({
  key: z.string().min(1, "Header key cannot be empty"),
  value: z.string(),
});

/** Schema for an array of HTTP headers. */
export const headersSchema = z.array(headerSchema).default([]);
export type Headers = z.infer<typeof headersSchema>;

/** Schema for headers as a key-value object. */
export const headersObjectSchema = z.record(z.string(), z.string());
export type HeadersObject = z.infer<typeof headersObjectSchema>;

// --- COOKIE SCHEMAS ---

/** Schema for cookie options. Reflects real-world usage where some fields are often omitted. */
export const cookieOptionsSchema = z.object({
  maxAge: z.number().optional(),
  path: z.string().optional(),
  domain: z.string().optional(),
  expires: z.date().optional(),
  httpOnly: z.boolean().default(false),
  secure: z.boolean().optional(),
  sameSite: z.union([z.boolean(), z.enum(["lax", "strict", "none"])]).optional(),
});
export type CookieOptions = z.infer<typeof cookieOptionsSchema>;

/** Schema for a single, parsed cookie with its name, value, and options. */
export const parsedCookieSchema = z.object({
  cookieName: z.string(),
  cookieValue: z.string(),
  options: cookieOptionsSchema,
});
export type ParsedCookie = z.infer<typeof parsedCookieSchema>;

/** Schema for the entire cookie store, grouped by a key (typically the domain). */
export const cookiesSchema = z.record(z.string(), z.array(parsedCookieSchema));
export type Cookies = z.infer<typeof cookiesSchema>;

// --- CORE DATA SCHEMAS ---

// A schema for a single action to be performed on a response.
export const responseActionSchema = z.object({
  id: z.string().uuid(),
  // Where to look for the data in the response
  source: z.enum(["BODY_JSON", "HEADER"]),
  // The path to the data (e.g., "data.token" or "x-auth-token")
  sourcePath: z.string(),
  // The name of the variable to save the extracted value to
  variableKey: z.string(),
});
export type ResponseAction = z.infer<typeof responseActionSchema>;

/** Schema for a complete request. */
const baseRequestSchema = z.object({
  method: methodSchema,
  url: z.string(),
  title: z.string().optional(),
  bodyType: z.enum(["NONE", "JSON", "FORM_DATA"]).optional().default("NONE"),
  body: z.string().optional(),
  params: z.string().optional(),
  query: z.string().optional(),
  variables: z.string().optional(),
  headers: headersSchema,
  responseActions: z.array(responseActionSchema).optional(),
});

const requestValidation = (data: z.infer<typeof baseRequestSchema>, ctx: z.RefinementCtx) => {
  if (data.bodyType === "JSON" && data.body) {
    try {
      JSON.parse(data.body);
    } catch (e) {
      ctx.addIssue({ path: ["body"], code: "custom", message: "Must be a valid JSON string" });
    }
  }
  if (data.bodyType === "FORM_DATA" && data.body) {
    try {
      z.array(z.object({ key: z.string(), value: z.string() })).parse(JSON.parse(data.body));
    } catch (e) {
      ctx.addIssue({ path: ["body"], code: "custom", message: "Must be a valid JSON array of key-value pairs" });
    }
  }
};

export const requestSchema = baseRequestSchema.extend({ id: z.string().uuid() }).superRefine(requestValidation);
export const newRequestSchema = baseRequestSchema.superRefine(requestValidation);

export type Request = z.infer<typeof requestSchema>;
export type NewRequest = z.infer<typeof newRequestSchema>;

/** Schema for a collection of requests. */
export const collectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  requests: z.array(requestSchema),
  headers: headersSchema,
});
export type Collection = z.infer<typeof collectionSchema>;

/** Schema for creating a new collection (omits `id`). */
export const newCollectionSchema = collectionSchema.omit({ id: true });
export type NewCollection = z.infer<typeof newCollectionSchema>;

// --- ENVIRONMENT ---

// // A set of key-value pairs for an environment
export const variableSchema = z.object({
  value: z.string(),
  isSecret: z.boolean().default(false),
});
export type Variable = z.infer<typeof variableSchema>;

// --- UPDATE THE ENVIRONMENT SCHEMA ---
export const environmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // Variables are now a record of the new Variable object.
  variables: z.record(z.string(), variableSchema),
});

export type Environment = z.infer<typeof environmentSchema>;

export const environmentsSchema = z.array(environmentSchema);
