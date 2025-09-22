import { Detail, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { useState, useMemo } from "react";
import { decksAtom, getDueCards } from "~/decks";
import { updateCardAfterReview } from "~/decks/store";
import { FeedbackQuality } from "~/lib/srs";
import { getCardDetailMarkdown } from "~/templates/card-info-template";

export default function ReviewSession({ deckId }: { deckId: string }) {
  const { pop } = useNavigation();
  const { value: decks, isHydrated } = useAtom(decksAtom);
  const deck = decks.find((d) => d.id === deckId);
  // Memoize the list of due cards so it's only calculated once
  const dueCards = useMemo(() => (deck ? getDueCards(deck) : []), [deckId]);

  // State to manage the session
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerShown, setIsAnswerShown] = useState(false);

  if (!isHydrated) {
    return <Detail isLoading={true} />;
  }

  if (dueCards.length === 0) {
    return (
      <Detail
        markdown="# No cards due for review! 🎉"
        actions={
          <ActionPanel>
            <Action title="Go Back" onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  if (currentIndex >= dueCards.length) {
    return (
      <Detail
        markdown={`# Review Complete! 🥳\n\nYou reviewed ${dueCards.length} cards.`}
        actions={
          <ActionPanel>
            <Action title="Finish" onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  const currentCard = dueCards[currentIndex];

  const handleFeedback = (quality: FeedbackQuality) => {
    // Update the card's SRS data in the store
    updateCardAfterReview(deckId, currentCard.id, quality);
    // Move to the next card and hide the answer
    setCurrentIndex(currentIndex + 1);
    setIsAnswerShown(false);
  };

  const markdownContent = isAnswerShown ? getCardDetailMarkdown(currentCard) : `## Front\n---\n${currentCard.front}`;

  return (
    <Detail
      markdown={markdownContent}
      navigationTitle={`Reviewing ${deck?.name} (${currentIndex + 1}/${dueCards.length})`}
      actions={
        !isAnswerShown ? (
          <ActionPanel>
            <Action title="Show Answer" icon={Icon.Eye} onAction={() => setIsAnswerShown(true)} />
          </ActionPanel>
        ) : (
          <ActionPanel title="How well did you remember?">
            <Action
              title="Good"
              shortcut={{ modifiers: [], key: "1" }}
              onAction={() => handleFeedback(FeedbackQuality.Good)}
            />
            <Action
              title="Easy"
              shortcut={{ modifiers: [], key: "2" }}
              onAction={() => handleFeedback(FeedbackQuality.Easy)}
            />
            <Action
              title="Hard"
              shortcut={{ modifiers: [], key: "3" }}
              onAction={() => handleFeedback(FeedbackQuality.Hard)}
            />
            <Action
              title="Again (Forgot)"
              shortcut={{ modifiers: [], key: "4" }}
              onAction={() => handleFeedback(FeedbackQuality.Again)}
            />
          </ActionPanel>
        )
      }
    />
  );
}
