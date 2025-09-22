import { randomUUID } from "crypto";
import { persistentAtom } from "@sebastianjarsve/persistent-atom";
import { createRaycastFileAdapter } from "~/lib/adapters";
import { showToast } from "@raycast/api";
import { CardFormSchema, DecksSchema } from "./schemas";
import type { Card, CardFormData, Deck } from "./types";
import { calculateSrsParameters, FeedbackQuality } from "~/lib/srs";
import { logger } from "~/lib/logger";
import { z } from "zod";
// --- ATOM DEFINITIONS ---

const initialDecks: Deck[] = [];

export const decksAtom = persistentAtom<Deck[]>(initialDecks, {
  storage: createRaycastFileAdapter("decks.json"),
  key: "decks",
  debounceMs: 500,
  deserialize: (json: string) => {
    try {
      const data = JSON.parse(json);
      const result = DecksSchema.safeParse(data);
      return result.success ? result.data : initialDecks;
    } catch (error) {
      showToast({ title: "Failed to load", message: JSON.stringify(error) });
      return initialDecks;
    }
  },
});

// --- SELECTORS ---

/**
 * A flexible selector for getting cards that are due for review.
 * @param deck The deck to check.
 *
 * @param options An object to configure the output.
 * @param options.sort If true, the returned cards will be shuffled.
 */
export function getDueCards(deck: Deck, options: { sort?: boolean } = {}): Card[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const dueCards = deck.cards.filter((card) => new Date(card.nextReviewDate) <= now);

  // Conditionally sort the array
  if (options.sort) {
    return dueCards.sort(() => Math.random() - 0.5);
  }

  return dueCards;
}

/**
 * A selector that counts how many cards in a deck are due.
 * It reuses the getDueCards logic without sorting.
 */
export function getDueCardsCount(deck: Deck) {
  return getDueCards(deck).length;
}

/**
 * A selector that counts how many cards in a all your decks that are due.
 */
export function getTotalDueCardsCount() {
  return decksAtom.get().reduce((total, deck) => {
    return total + getDueCardsCount(deck);
  }, 0);
}

/**
 * A selector that returns a sorted, unique list of all tags from all cards.
 */
export function getAllUniqueTags(): string[] {
  const allDecks = decksAtom.get();

  // 1. Get a single array of all tags from all cards
  const allTags = allDecks.flatMap((deck) => deck.cards.flatMap((card) => card.tags));

  // 2. Use a Set to get only the unique tags, then convert back to an array
  const uniqueTags = [...new Set(allTags)];

  // 3. Sort them alphabetically for a clean UI
  return uniqueTags.sort();
}

// --- ACTIONS ---

export async function addDeck(name: string) {
  const newDeck: Deck = { id: randomUUID(), name, cards: [] };
  await decksAtom.setAndFlush([...decksAtom.get(), newDeck]);
}

export async function editDeck(deckId: string, newName: string) {
  const currentDecks = decksAtom.get();
  const updatedDecks = currentDecks.map((deck) => {
    if (deck.id === deckId) {
      // Return a new object for the matched deck with the updated name
      return { ...deck, name: newName };
    }
    // Return the deck unchanged if it's not the one we're editing
    return deck;
  });
  await decksAtom.setAndFlush(updatedDecks);
}

export async function deleteDeck(deckId: string) {
  const currentDecks = decksAtom.get();
  const updatedDecks = currentDecks.filter((deck) => deck.id !== deckId);
  await decksAtom.setAndFlush(updatedDecks);
}

export async function addCard(deckId: string, cardData: CardFormData) {
  const currentDecks = decksAtom.get();
  const parentDeck = currentDecks.find((d) => d.id === deckId);
  if (!parentDeck) {
    throw new Error("Deck not found.");
  }

  // Normalize the input for comparison
  const normalizedFront = cardData.front.trim().toLowerCase();

  // Check for duplicate: See if any existing card has the same front
  const isDuplicate = parentDeck.cards.some((card) => card.front.trim().toLowerCase() === normalizedFront);

  if (isDuplicate) {
    throw new Error("[ExistingCardError] A card with this front already exists in this deck.");
  }

  const newCard: Card = {
    ...cardData,
    id: randomUUID(),
    deckId,
    // Default SRS parameters for a new card
    repetition: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
  };

  const updatedDecks = currentDecks.map((deck) => {
    if (deck.id === deckId) {
      return { ...deck, cards: [...deck.cards, newCard] };
    }
    return deck;
  });
  await decksAtom.setAndFlush(updatedDecks);
}

export async function editCard(deckId: string, cardId: string, newValues: CardFormData) {
  const currentDecks = decksAtom.get();
  const parentDeck = currentDecks.find((d) => d.id === deckId);
  if (!parentDeck) {
    throw new Error("Deck not found.");
  }

  const normalizedFront = newValues.front.trim().toLowerCase();

  // Check for duplicate: See if another card (not the one we're editing) has the same front
  const isDuplicate = parentDeck.cards.some(
    (card) => card.id !== cardId && card.front.trim().toLowerCase() === normalizedFront,
  );

  if (isDuplicate) {
    throw new Error("Another card with this front already exists in this deck.");
  }

  const updatedDecks = currentDecks.map((deck) => {
    if (deck.id === deckId) {
      const updatedCards = deck.cards.map((card) => {
        if (card.id === cardId) {
          return { ...card, ...newValues };
        }
        return card;
      });
      return { ...deck, cards: updatedCards };
    }
    return deck;
  });
  await decksAtom.setAndFlush(updatedDecks);
}

export async function deleteCard(deckId: string, cardId: string) {
  const currentDecks = decksAtom.get();
  const updatedDecks = currentDecks.map((deck) => {
    if (deck.id === deckId) {
      const updatedCards = deck.cards.filter((card) => card.id !== cardId);
      return { ...deck, cards: updatedCards };
    }
    return deck;
  });
  await decksAtom.setAndFlush(updatedDecks);
}

/**
 * Updates a card with new SRS parameters after a user reviews it.
 * @param deckId The ID of the deck containing the card.
 * @param cardId The ID of the card to update.
 * @param quality The user's rating of their recall (0-5).
 */
export async function updateCardAfterReview(deckId: string, cardId: string, quality: FeedbackQuality) {
  const currentDecks = decksAtom.get();

  const updatedDecks = currentDecks.map((deck) => {
    // Find the correct deck
    if (deck.id === deckId) {
      const updatedCards = deck.cards.map((card) => {
        // Find the correct card
        if (card.id === cardId) {
          // Calculate the new SRS parameters based on the review quality
          const newSrsParams = calculateSrsParameters(card, quality);
          // Return a new card object with the updated parameters
          return { ...card, ...newSrsParams };
        }
        return card;
      });
      return { ...deck, cards: updatedCards };
    }
    return deck;
  });

  decksAtom.setAndFlush(updatedDecks);
}

export async function importCardsIntoDeck(deckId: string, cardsDataString: string) {
  let cards: unknown;
  try {
    cards = JSON.parse(cardsDataString);
  } catch (e) {
    logger.error(`Unable to import cards to deck ${deckId}`, e);
    return;
  }

  if (!Array.isArray(cards)) {
    logger.error("Parsed JSON is not an array", cards);
    return;
  }

  for (const card of cards) {
    try {
      const parsedCard = CardFormSchema.parse(card);
      await addCard(deckId, parsedCard); // <-- await so rejections are caught
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("[ExistingCardError]")) {
        logger.info("Skipping existing card...");
        continue;
      }
      logger.error(`An error occurred for this card`, { card, error });
    }
  }
}
