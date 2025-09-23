import { Action, ActionPanel, List, Icon, confirmAlert, Alert, Clipboard } from "@raycast/api";
import { decksAtom, deleteCard } from "~/decks";
import { GlobalActions } from "~/components/glabl-actions";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { CardForm } from "~/views/card-form";
import { getCardDetailMarkdown } from "~/templates/card-info-template";
import { importCardsIntoDeck } from "~/decks/store";

function CommonActions({ deckId }: { deckId: string }) {
  return (
    <>
      <Action.Push
        title="Add New Card"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CardForm deckId={deckId} />}
      />
      <Action
        title={`Import cards from clipboard`}
        icon={Icon.PlusTopRightSquare}
        onAction={async () => {
          const string = await Clipboard.readText();
          if (string) importCardsIntoDeck(deckId, string);
        }}
      />
      <GlobalActions />
    </>
  );
}

export default function CardListView({ deckId }: { deckId: string }) {
  const { value: decks, isHydrated } = useAtom(decksAtom);
  const deck = decks.find((d) => d.id === deckId);

  return (
    <List
      navigationTitle={deck?.name || "Cards"}
      isShowingDetail
      isLoading={!isHydrated}
      actions={
        <ActionPanel>
          <CommonActions deckId={deckId} />
        </ActionPanel>
      }
    >
      {deck?.cards.map((card) => (
        <List.Item
          key={card.id}
          title={card.front}
          accessories={[{ text: `Due: ${new Date(card.nextReviewDate).toLocaleDateString()}` }]}
          detail={
            <List.Item.Detail
              markdown={getCardDetailMarkdown(card)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Next Review"
                    text={new Date(card.nextReviewDate).toLocaleDateString()}
                  />
                  <List.Item.Detail.Metadata.Label title="Interval" text={`${card.interval} days`} />
                  <List.Item.Detail.Metadata.Label title="Ease Factor" text={card.easeFactor.toFixed(2)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Repetitions" text={`${card.repetition}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Date added" text={`${new Date(card.dateAdded)}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title={`Card: ${card.front.substring(0, 20)}...`}>
                <Action.Push
                  title="Edit Card"
                  icon={Icon.Pencil}
                  target={<CardForm deckId={deck.id} cardId={card.id} />}
                />
                <Action
                  title="Delete Card"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Delete Card?",
                        message: "This action cannot be undone.",
                        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      deleteCard(deck.id, card.id);
                    }
                  }}
                />
              </ActionPanel.Section>
              <CommonActions deckId={deckId} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
