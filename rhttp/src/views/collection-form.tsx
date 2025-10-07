// CollectionForm.tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Collection, NewCollection, Headers } from "../types";
import { $collections, createCollection, updateCollection } from "../store";

import { z } from "zod";
import { ErrorDetail } from "./error-view";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { KeyValueEditor } from "../components/key-value-editor";
import { COMMON_HEADER_KEYS } from "~/constants";
import { CopyVariableAction, GlobalActions } from "~/components/actions";

interface CollectionFormProps {
  collectionId?: string;
}

export function CollectionForm({ collectionId }: CollectionFormProps) {
  const { pop, push } = useNavigation();
  const { value: collections } = useAtom($collections);

  const [collection] = useState<Collection | NewCollection | undefined>(() => {
    if (collectionId) {
      return collections.find((c) => c.id === collectionId);
    }
    return { title: "", requests: [], headers: [], lastActiveEnvironmentId: null };
  });

  const [headers, setHeaders] = useState<Headers>(collection?.headers ?? []);
  // State to track the currently focused header index ---
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!collection) {
    return (
      <Form navigationTitle="Error">
        <Form.Description text="Error: Collection not found." />
      </Form>
    );
  }

  async function handleSubmit(values: { title: string }) {
    try {
      const collectionData = { ...values, headers };
      if (collectionId) {
        updateCollection(collectionId, collectionData);
        showToast({ title: "Collection Updated" });
      } else {
        createCollection(collectionData as NewCollection);
        showToast({ title: "Collection Created" });
      }
      pop();
    } catch (error) {
      // This block runs if Zod's .parse() throws an error.
      if (error instanceof z.ZodError) {
        // We can format a user-friendly message from the Zod error.
        push(<ErrorDetail error={error} />);
      } else {
        // Handle other unexpected errors.
        showToast({
          style: Toast.Style.Failure,
          title: "An unknown error occurred",
        });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Collection"
            icon={Icon.HardDrive}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={handleSubmit}
          />
          <Action
            title="Add Header"
            icon={Icon.Plus}
            onAction={() => setHeaders([...headers, { key: "", value: "" }])}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          {/* --- 3. The new "Remove Header" action --- */}
          {activeIndex !== null && (
            <Action
              title="Remove Header"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => {
                if (activeIndex === null) return;
                setHeaders(headers.filter((_, i) => i !== activeIndex));
                setActiveIndex(null);
                showToast({ style: Toast.Style.Success, title: "Header Removed" });
              }}
              shortcut={{ modifiers: ["ctrl"], key: "h" }}
            />
          )}
          <CopyVariableAction />
          <GlobalActions />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="My API Collection" defaultValue={collection.title} />
      <Form.Separator />

      <KeyValueEditor
        pairs={headers}
        onPairsChange={setHeaders}
        onActiveIndexChange={setActiveIndex}
        title="Headers"
        commonKeys={COMMON_HEADER_KEYS}
      />
    </Form>
  );
}
