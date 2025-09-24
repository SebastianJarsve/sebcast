import { Detail, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";

import { useState } from "react";
import { Card } from "~/decks";
import { updateCardAfterReview } from "~/decks/store";
import { FeedbackQuality } from "~/lib/srs";
import { getCardDetailMarkdown } from "~/templates/card-info-template";
import { CardForm } from "./card-form";

type Props = {
  dueCards: Card[];
  total: number;
  name: string;
};

export default function ReviewSession({ dueCards, name, total }: Props) {
  const { pop } = useNavigation();
  // Memoize the list of due cards so it's only calculated once
  // const dueCardsCount = useMemo(() => getDueCardsCount(deckId), [deckId]);

  // State to manage the session
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerShown, setIsAnswerShown] = useState(false);

  if (total === 0) {
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

  if (currentIndex >= total) {
    return (
      <Detail
        markdown={`# Review Complete! 🥳\n\nYou reviewed ${total} cards.`}
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
    updateCardAfterReview(currentCard.deckId, currentCard.id, quality);
    // Move to the next card and hide the answer
    setCurrentIndex(currentIndex + 1);
    setIsAnswerShown(false);
  };

  const markdownContent = isAnswerShown ? getCardDetailMarkdown(currentCard) : `# Front\n---\n${currentCard.front}`;

  return (
    <Detail
      markdown={markdownContent}
      navigationTitle={`Reviewing ${name} (${currentIndex + 1}/${total})`}
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
            <Action.Push
              title="Edit card"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<CardForm deckId={currentCard.deckId} cardId={currentCard.id} />}
            />
          </ActionPanel>
        )
      }
    />
  );
}
