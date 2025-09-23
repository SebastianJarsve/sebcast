import { z } from "zod";

export const ReviewHistorySchema = z.object({
  date: z.string().datetime(),
  quality: z.number(),
});

/**
 * ## Card Schema
 * Defines the structure and validation rules for a single flashcard.
 * It includes the front and back content, along with all the necessary
 * parameters for the Spaced Repetition System (SRS).
 */
export const CardSchema = z.object({
  id: z.string().uuid().describe("The unique identifier for the card."),
  deckId: z.string().uuid().describe("The ID of the deck this card belongs to."),
  front: z.string().min(1, "The front of the card cannot be empty."),
  back: z.string().min(1, "The back of the card cannot be empty."),
  tags: z.array(z.string()).optional().default([]),
  dateAdded: z.string().datetime().describe("Thes ISO 8604 datetime string for when the card was added to the deck."),
  reviewHistory: z.array(ReviewHistorySchema).optional().default([]),

  // SRS Parameters
  repetition: z.number().int().nonnegative().describe("Number of times the card has been recalled correctly in a row."),
  interval: z.number().int().positive().describe("The interval in days until the next review."),
  easeFactor: z.number().min(1.3).describe("A multiplier for the interval, representing how 'easy' the card is."),
  nextReviewDate: z.string().datetime().describe("The ISO 8601 datetime string for the next scheduled review."),
});

export const CardFormSchema = CardSchema.pick({
  front: true,
  back: true,
  tags: true,
});

/**
 * ## Deck Schema
 * Defines a deck, which is a collection of cards. It includes a unique
 * identifier and a name for the deck.
 */
export const DeckSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "The deck name cannot be empty."),
  cards: z.array(CardSchema),
  dateAdded: z.string().datetime().describe("Thes ISO 8604 datetime string for when the deck was added to the deck."),
});

/**
 * ## All decks schema
 * Schema for how we are storing all decks.
 */
export const DecksSchema = z.array(DeckSchema);
