import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { decksAtom, addCard, editCard } from "../decks";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { logger } from "~/lib/logger";

interface CardFormProps {
  /**
   * The ID of the deck which this card belongs to.
   */
  deckId: string;
  /**
   * Optional card ID. When provided the form is in edit mode.
   */
  cardId?: string;
}

export function CardForm({ deckId, cardId }: CardFormProps) {
  const { pop } = useNavigation();
  const { value: decks, isHydrated } = useAtom(decksAtom);

  const isEditMode = cardId !== undefined;

  const parentDeck = decks.find((d) => d.id === deckId);
  const cardToEdit = isEditMode ? parentDeck?.cards.find((c) => c.id === cardId) : undefined;

  function handleSubmit(values: { front: string; back: string }) {
    if (!values.front || !values.back) {
      showToast({ style: Toast.Style.Failure, title: "Front and Back cannot be empty" });
      return;
    }

    try {
      if (isEditMode && cardId) {
        editCard(deckId, cardId, values);
        showToast({ style: Toast.Style.Success, title: "Card Updated" });
      } else {
        addCard(deckId, values);
        showToast({ style: Toast.Style.Success, title: "Card Created" });
      }
      pop();
    } catch (error) {
      showToast({
        title: "Failed to Save Card",
        message: error instanceof Error ? error.message : "An unknown error occurred.",
      });
      logger.error("Failed to Save Card", error);
    }
  }

  return (
    <Form
      isLoading={!isHydrated}
      navigationTitle={isEditMode ? "Edit Card" : `New Card in ${parentDeck?.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditMode ? "Save Changes" : "Create Card"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="front"
        title="Front"
        placeholder="e.g., What is a React Hook?"
        defaultValue={cardToEdit?.front || ""}
        enableMarkdown
        info="Markdown is enabled"
      />
      <Form.TextArea
        id="back"
        title="Back"
        placeholder="e.g., A function that lets you hook into React state and lifecycle features from function components."
        defaultValue={cardToEdit?.back || ""}
        enableMarkdown
        info="Markdown is enabled"
      />
    </Form>
  );
}
