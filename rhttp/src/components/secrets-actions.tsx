// src/components/SecretsActions.tsx
import { Action, ActionPanel, Icon } from "@raycast/api";
import { ManageSecretsList } from "../views/manage-secrets-list";

export function SecretsActions() {
  return (
    <ActionPanel.Section title="Secrets">
      <Action.Push
        title="Manage Secrets"
        icon={Icon.Key}
        target={<ManageSecretsList />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
    </ActionPanel.Section>
  );
}
