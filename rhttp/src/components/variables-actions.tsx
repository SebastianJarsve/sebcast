// src/components/EnvironmentsActions.tsx
import { Action, ActionPanel, Icon } from "@raycast/api";
import { ManageVariablesList } from "../views/manage-variables-list";

export function EnvironmentsActions() {
  return (
    <ActionPanel.Section title="Environments">
      <Action.Push
        title="Manage Environments"
        icon={Icon.Key}
        target={<ManageVariablesList />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      />
    </ActionPanel.Section>
  );
}
