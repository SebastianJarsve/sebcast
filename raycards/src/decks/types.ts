import { z } from "zod";
import { CardSchema, DeckSchema } from "./schemas";

/**
 * ## Inferred TypeScript Types
 * These types are automatically generated from the Zod schemas, ensuring
 * that your static types always match your runtime validation rules.
 */
export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;
