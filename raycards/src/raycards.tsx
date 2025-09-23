import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { decksAtom, deleteDeck } from "~/decks";
import { DeckForm } from "./views/deck-form";
import { GlobalActions } from "./components/glabl-actions";
import { CardForm } from "./views/card-form";
import CardListView from "./views/card-list-view";
import ReviewSession from "./views/review-session";
import { getDueCards, getTotalDueCardsCount } from "./decks/store";

function CommonActions() {
  return <GlobalActions />;
}

export default function Command() {
  // Subscribe to the atom to get deck data
  const { value: decks, isHydrated: isDecksHydrated } = useAtom(decksAtom);
  const totalDueCards = getTotalDueCardsCount();

  return (
    <List
      isLoading={!isDecksHydrated}
      navigationTitle={`RayCards Decks (${totalDueCards} Due)`}
      searchBarPlaceholder="Search your decks..."
      actions={
        <ActionPanel>
          <CommonActions />
        </ActionPanel>
      }
    >
      {decks.map((deck) => {
        const dueCards = getDueCards(deck, { shuffle: true });
        const dueCount = dueCards.length;

        return (
          <List.Item
            key={deck.id}
            title={deck.name}
            accessories={[
              {
                tag: { value: `${dueCount}`, color: dueCount > 0 ? "#4CAF50" : undefined },
                tooltip: "Cards Due for Review",
                icon: Icon.Clock,
              },
              {
                text: `${deck.cards.length} cards`,
                icon: Icon.Layers,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={`Deck: ${deck.name}`}>
                  <Action.Push title="Browse Cards" icon={Icon.Pencil} target={<CardListView deckId={deck.id} />} />
                  <Action.Push
                    title="Start Review Session"
                    icon={Icon.Play}
                    target={<ReviewSession name={`Deck: ${deck.name}`} dueCards={dueCards} total={dueCount} />}
                  />
                  <Action.Push
                    title="Add New Card"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CardForm deckId={deck.id} />}
                  />
                  <Action.Push
                    title="Rename Deck"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={<DeckForm deckId={deck.id} />}
                  />
                  <Action
                    title="Delete Deck"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Deck?",
                          message: `This will delete "${deck.name}" and all ${deck.cards.length} of its cards.`,
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        deleteDeck(deck.id);
                      }
                    }}
                  />
                </ActionPanel.Section>
                <CommonActions />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
