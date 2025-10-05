import { z } from "zod";
import { METHODS } from "./constants";

const methodKeys = Object.keys(METHODS) as [keyof typeof METHODS, ...Array<keyof typeof METHODS>];
/** Zod schema for validating that a string is one of the defined methods. */
export const methodSchema = z.enum(methodKeys);
export type Method = z.infer<typeof methodSchema>;

// --- GENERIC UTILITY TYPES ---

/** A utility type that makes specific keys (K) of a type (T) optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// --- REUSABLE ZOD SCHEMAS ---

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
  id: z.uuid(),
  // Where to look for the data in the response
  source: z.enum(["BODY_JSON", "HEADER"]),
  // The path to the data (e.g., "data.token" or "x-auth-token")
  sourcePath: z.string(),
  // The name of the variable to save the extracted value to
  variableKey: z.string(),
  storage: z.enum(["TEMPORARY", "ENVIRONMENT"]).default("TEMPORARY"),
});
export type ResponseAction = z.infer<typeof responseActionSchema>;

export const preRequestActionSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  enabled: z.boolean().default(true),
});

export type PreRequestAction = z.infer<typeof preRequestActionSchema>;

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
  preRequestActions: z.array(preRequestActionSchema).optional(),
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

export const requestSchema = baseRequestSchema.extend({ id: z.uuid() }).superRefine(requestValidation);
export const newRequestSchema = baseRequestSchema.superRefine(requestValidation);

export type Request = z.infer<typeof requestSchema>;
export type NewRequest = z.infer<typeof newRequestSchema>;

/** Schema for a collection of requests. */
export const collectionSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  requests: z.array(requestSchema),
  headers: headersSchema,
  lastActiveEnvironmentId: z.uuid().nullable().optional().default(null),
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

export const variablesSchema = z.record(z.string(), variableSchema);

export type Variables = z.infer<typeof variablesSchema>;

// --- UPDATE THE ENVIRONMENT SCHEMA ---
export const environmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  // Variables are now a record of the new Variable object.
  variables: variablesSchema,
});

export type Environment = z.infer<typeof environmentSchema>;

export const environmentsSchema = z.array(environmentSchema);

// --- HISTORY SCHEMAS ---
// A schema for the response data we want to save
export const responseDataSchema = z.object({
  requestMethod: methodSchema,
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
});
export type ResponseData = z.infer<typeof responseDataSchema>;

// A schema for a single entry in our history log
export const historyEntrySchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  requestSnapshot: newRequestSchema, // The original request that was run
  sourceRequestId: z.uuid().optional(),
  response: responseDataSchema, // The response that was received
  activeEnvironmentId: z.uuid().optional(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const historySchema = z.array(historyEntrySchema);
