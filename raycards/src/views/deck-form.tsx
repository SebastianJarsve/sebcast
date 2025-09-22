import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { addDeck, decksAtom, editDeck } from "~/decks";

export function DeckForm({ deckId }: { deckId?: string }) {
  const { pop } = useNavigation();
  const { value: decks } = useAtom(decksAtom);

  // Determine if we are in "edit" mode
  const isEditMode = deckId !== undefined;
  const deckToEdit = isEditMode ? decks.find((d) => d.id === deckId) : undefined;

  function handleSubmit(values: { name: string }) {
    if (!values.name) {
      showToast({ style: Toast.Style.Failure, title: "Name cannot be empty" });
      return;
    }

    if (isEditMode && deckId) {
      editDeck(deckId, values.name);
      showToast({ style: Toast.Style.Success, title: "Deck Updated" });
    } else {
      addDeck(values.name);
      showToast({ style: Toast.Style.Success, title: "Deck Created" });
    }
    pop();
  }

  return (
    <Form
      navigationTitle={isEditMode ? `Edit Deck: ${deckToEdit?.name}` : "Create New Deck"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditMode ? "Save Changes" : "Create Deck"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Deck Name"
        placeholder="e.g., Spanish words"
        defaultValue={deckToEdit?.name || ""}
      />
    </Form>
  );
}
