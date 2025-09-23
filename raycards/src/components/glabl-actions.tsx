import { Action, ActionPanel, Icon } from "@raycast/api";
import { DeckForm } from "~/views/deck-form";
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
    </ActionPanel.Section>
  );
}
