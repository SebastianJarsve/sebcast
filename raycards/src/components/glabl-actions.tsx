import { Action, ActionPanel, Icon } from "@raycast/api";
import { DeckForm } from "~/views/deck-form";

export function GlobalActions() {
  return (
    <ActionPanel.Section title="Global">
      <Action.Push
        title="New Deck"
        icon={Icon.PlusCircle}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<DeckForm />}
      />
    </ActionPanel.Section>
  );
}
