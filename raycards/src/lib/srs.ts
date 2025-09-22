import type { Card } from "~/decks";

export enum FeedbackQuality {
  Again = 0,
  Hard = 3,
  Good = 4,
  Easy = 5,
}

const MIN_EASE_FACTOR = 1.3;

/**
 * Calculates the new SRS parameters for a card based on the quality of the user's answer.
 * This is an implementation of the SM-2 algorithm.
 *
 * @param card The current card that was reviewed.
 * @param quality The quality of the answer (0=forgot, 3=hard, 4=good, 5=easy).
 * @returns An object with the updated SRS parameters for the card.
 */
export function calculateSrsParameters(card: Card, quality: FeedbackQuality): Partial<Card> {
  // If the user forgot the card, reset its progress.
  if (quality < 3) {
    return {
      repetition: 0,
      interval: 1,
    };
  }

  // --- If the user remembered the card ---

  // 1. Calculate the new "ease factor"
  let newEaseFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < MIN_EASE_FACTOR) {
    newEaseFactor = MIN_EASE_FACTOR;
  }

  // 2. Calculate the new interval
  let newInterval: number;
  if (card.repetition === 0) {
    newInterval = 1;
  } else if (card.repetition === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.ceil(card.interval * newEaseFactor);
  }

  // 3. Set the next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetition: card.repetition + 1,
    easeFactor: newEaseFactor,
    interval: newInterval,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}
