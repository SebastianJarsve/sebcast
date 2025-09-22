import { randomUUID } from "crypto";
import { persistentAtom } from "@sebastianjarsve/persistent-atom";
import { createRaycastFileAdapter } from "~/lib/adapters";
import { showToast } from "@raycast/api";
import { DecksSchema } from "./schemas";
import type { Card, Deck } from "./types";
import { calculateSrsParameters, FeedbackQuality } from "~/lib/srs";

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

export async function addCard(deckId: string, cardData: { front: string; back: string }) {
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
    throw new Error("A card with this front already exists in this deck.");
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

export async function editCard(deckId: string, cardId: string, newValues: { front: string; back: string }) {
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
export function updateCardAfterReview(deckId: string, cardId: string, quality: FeedbackQuality) {
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

  decksAtom.set(updatedDecks);
}
