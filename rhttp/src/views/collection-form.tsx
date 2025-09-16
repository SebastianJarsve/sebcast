// CollectionForm.tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, Fragment, useRef, useEffect } from "react";
import { Collection, NewCollection, Headers } from "../types";
import { $collections, createCollection, updateCollection, useAtom } from "../store";
import { HeadersEditor } from "../headers-editor";
import { z } from "zod";
import { ErrorDetail } from "./error-view";

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
    return { title: "", requests: [], headers: [] };
  });

  const [headers, setHeaders] = useState<Headers>(collection?.headers ?? []);
  // State to track the currently focused header index ---
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Used to focus the field when a header field is removed.
  const titleFieldRef = useRef<Form.TextField>(null);
  // Create a ref to hold an array of refs for each header field
  const headerFieldRefs = useRef<(Form.Dropdown | null)[]>([]);

  useEffect(() => {
    // This effect runs only when the number of headers changes
    headerFieldRefs.current = headerFieldRefs.current.slice(0, headers.length);
  }, [headers]);

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
            icon={Icon.SaveDocument}
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

                const newFocusIndex = activeIndex > 0 ? activeIndex - 1 : 0;

                const newHeaders = headers.filter((_, i) => i !== activeIndex);
                setHeaders(headers.filter((_, i) => i !== activeIndex));
                setActiveIndex(null);
                showToast({ style: Toast.Style.Success, title: "Header Removed" });

                // Defer the focus call until after React has re-rendered
                setTimeout(() => {
                  if (newHeaders.length === 0) {
                    // If no headers remain, focus the title field.
                    titleFieldRef.current?.focus();
                  } else {
                    // If headers remain, focus the new last one.
                    headerFieldRefs.current[newFocusIndex]?.focus();
                  }
                }, 0); // A 0ms delay is enough to push this to the end of the event queue
              }}
              shortcut={{ modifiers: ["ctrl"], key: "h" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="My API Collection" defaultValue={collection.title} />
      <Form.Separator />

      <HeadersEditor
        headers={headers}
        onHeadersChange={setHeaders}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        headerFieldRefs={headerFieldRefs}
      />
    </Form>
  );
}
