import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { decksAtom, addCard, editCard, CardFormData } from "../decks";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { logger } from "~/lib/logger";
import { getAllUniqueTags } from "~/decks/store";
import { useMemo, useState } from "react";

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

  const [selectedTags, setSelectedTags] = useState<string[]>(
    cardToEdit?.tags || (parentDeck?.name ? [parentDeck?.name.toLowerCase()] : []),
  );
  const [tagInput, setTagInput] = useState(""); // State for the text input field

  const existingTags = useMemo(getAllUniqueTags, [decks]);
  const allTags = useMemo(() => Array.from(new Set([...existingTags, ...selectedTags])), [existingTags, selectedTags]);

  // --- Handlers ---
  function handleProcessTagInput() {
    // Take the text from the input, split by comma, clean it up
    const newTags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (newTags.length === 0) return;

    // Add the new tags to the existing list, ensuring no duplicates
    const combined = [...selectedTags, ...newTags];
    const unique = [...new Set(combined)];

    setSelectedTags(unique);
    setTagInput(""); // Clear the input field after processing
  }

  function handleSubmit(values: CardFormData) {
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
      {/* This TagPicker is for displaying and removing tags */}
      <Form.TagPicker id="tags" title="Selected Tags" value={selectedTags} onChange={setSelectedTags}>
        {allTags.map((tag) => (
          <Form.TagPicker.Item title={tag} key={tag} value={tag} />
        ))}
      </Form.TagPicker>

      {/* This TextField is for typing new tags */}
      <Form.TextField
        id="tag-input"
        title="New Tag"
        placeholder="react,"
        info="Type a tag here, end with comma or space."
        value={tagInput}
        onChange={(value) => {
          const newValue = value.trim();
          if (newValue.endsWith(",") || newValue.endsWith(" ")) {
            handleProcessTagInput();
            setTagInput("");
            return;
          }
          setTagInput(value);
        }}
      />
    </Form>
  );
}
