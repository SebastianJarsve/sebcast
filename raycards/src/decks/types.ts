import { z } from "zod";
import {
  CardSchema,
  DeckSchema,
  CardFormSchema,
  ReviewHistorySchema,
  ExportDeckSchema,
  ExportCardSchema,
} from "./schemas";

/**
 * ## Inferred TypeScript Types
 * These types are automatically generated from the Zod schemas, ensuring
 * that your static types always match your runtime validation rules.
 */
export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type CardFormData = z.infer<typeof CardFormSchema>;
export type ReviewHistory = z.infer<typeof ReviewHistorySchema>;

export type ExportCard = z.infer<typeof ExportCardSchema>;
export type ExportDeck = z.infer<typeof ExportDeckSchema>;
