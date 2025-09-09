// src/views/SecretForm.tsx
import { Action, ActionPanel, Form, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { $collections, useAtom } from "../store";
import { Secret } from "../types";
import { $secrets, createSecret, updateSecret } from "../secrets";

interface SecretFormProps {
  secretId?: string;
}

export function SecretForm({ secretId }: SecretFormProps) {
  const { pop } = useNavigation();
  const { value: secrets } = useAtom($secrets);
  const { value: collections } = useAtom($collections);

  const [secret] = useState(() => secrets.find((s) => s.id === secretId));
  const [scope, setScope] = useState(secret?.scope ?? "global");

  function handleSubmit(values: { key: string; value: string; collectionId?: string }) {
    const secretData = {
      key: values.key,
      value: values.value,
      scope,
      collectionId: scope === "collection" ? values.collectionId : undefined,
    };

    if (secretId) {
      updateSecret(secretId, secretData);
      showToast({ title: "Secret Updated" });
    } else {
      createSecret(secretData as Omit<Secret, "id">);
      showToast({ title: "Secret Created" });
    }
    pop();
  }

  return (
    <Form
      navigationTitle={secretId ? "Edit Secret" : "Create Secret"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="Key" placeholder="e.g., my_api_token" defaultValue={secret?.key} />
      <Form.PasswordField id="value" title="Value" placeholder="Enter secret value" defaultValue={secret?.value} />
      <Form.Dropdown
        id="scope"
        title="Scope"
        value={scope}
        onChange={(newValue) => setScope(newValue as "global" | "collection")}
      >
        <Form.Dropdown.Item value="global" title="Global" />
        <Form.Dropdown.Item value="collection" title="Collection" />
      </Form.Dropdown>

      {scope === "collection" && (
        <Form.Dropdown id="collectionId" title="Collection" defaultValue={secret?.collectionId}>
          {collections.map((c) => (
            <Form.Dropdown.Item key={c.id} value={c.id} title={c.title} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
