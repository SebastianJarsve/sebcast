import type { Card } from "~/decks";

/**
 * Generates the Markdown content for a card's detail view.
 * @param card The card object.
 * @returns A formatted Markdown string.
 */
export function getCardDetailMarkdown(card: Card): string {
  return `
# Front
---
${card.front.split("\n")[0]}

# Back
---
${card.back.split("\n")[0]}
`;
}
