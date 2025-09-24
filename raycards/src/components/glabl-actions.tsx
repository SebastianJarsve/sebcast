import { Action, ActionPanel, Clipboard, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { importDeck } from "~/decks/store";
import { DeckForm } from "~/views/deck-form";
import HelpListView from "~/views/help-view";
import StatisticsView from "~/views/statistics-view";

export function GlobalActions() {
  return (
    <ActionPanel.Section title="Global">
      <Action.Push
        title="New Deck"
        icon={Icon.PlusCircle}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<DeckForm />}
      />
      <Action.Push
        title="View Statistics"
        icon={Icon.BarChart}
        target={<StatisticsView />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action
        title="Import deck from clipboard"
        onAction={async () => {
          const string = await Clipboard.readText();
          if (string) {
            try {
              importDeck(string);
            } catch (error) {
              showFailureToast(error);
            }
          }
        }}
      />
      <Action.Push
        title="View Help Guide"
        icon={Icon.QuestionMarkCircle}
        target={<HelpListView />} // <-- Point to the new list view
        shortcut={{ modifiers: ["cmd"], key: "h" }}
      />
    </ActionPanel.Section>
  );
}
