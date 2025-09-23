import { Detail } from "@raycast/api";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { decksAtom, getDeckAndCardCounts, getReviewStats, getCardMaturityStats } from "~/decks";

export default function StatisticsView() {
  const { isHydrated } = useAtom(decksAtom);

  if (!isHydrated) {
    return <Detail isLoading={true} />;
  }

  // Call our new selectors to get the data
  const { deckCount, cardCount } = getDeckAndCardCounts();
  const { reviewsToday, reviewsThisWeek } = getReviewStats();
  const maturity = getCardMaturityStats();

  const markdownContent = `
# Review Activity
---
- **Today**: ${reviewsToday} reviews
- **Last 7 Days**: ${reviewsThisWeek} reviews

# Card Maturity
---
- **New**: ${maturity.new} cards (Just introduced)
- **Learning**: ${maturity.learning} cards (Interval < 21 days)
- **Mature**: ${maturity.mature} cards (Interval >= 21 days)
  `;

  return (
    <Detail
      navigationTitle="Statistics"
      markdown={markdownContent}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Total Decks" text={`${deckCount}`} />
          <Detail.Metadata.Label title="Total Cards" text={`${cardCount}`} />
        </Detail.Metadata>
      }
    />
  );
}
