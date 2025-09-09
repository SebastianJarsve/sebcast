// src/views/ManageSecretsList.tsx
import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { SecretForm } from "./secret-form";
import { $collections, useAtom } from "../store";
import { $secrets, deleteSecret } from "../secrets";
import { Secret } from "../types";

export function ManageSecretsList() {
  const { value: secrets } = useAtom($secrets);
  const { value: collections } = useAtom($collections);

  // Group secrets by scope for display
  const groupedSecrets = secrets.reduce((acc: Record<string, Secret[]>, secret) => {
    const groupName =
      secret.scope === "global"
        ? "Global Secrets"
        : `Collection: ${collections.find((c) => c.id === secret.collectionId)?.title ?? "Unknown"}`;

    if (!acc[groupName]) {
      acc[groupName] = [];
    }

    acc[groupName].push(secret);
    return acc;
  }, {}); // The initial value is just an empty object

  return (
    <List
      navigationTitle="Manage Secrets"
      actions={
        <ActionPanel>
          <Action.Push title="Create New Secret" target={<SecretForm />} />
        </ActionPanel>
      }
    >
      {Object.entries(groupedSecrets).map(([groupName, secretsInGroup]) => (
        <List.Section key={groupName} title={groupName}>
          {secretsInGroup.map((secret) => (
            <List.Item
              key={secret.id}
              title={secret.key}
              accessories={[{ text: `{{${secret.key}}}` }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Edit Secret" icon={Icon.Pencil} target={<SecretForm secretId={secret.id} />} />
                  <Action
                    title="Delete Secret"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => {
                      deleteSecret(secret.id);
                      showToast({ style: Toast.Style.Success, title: "Secret Deleted" });
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Placeholder" content={`{{${secret.key}}}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
