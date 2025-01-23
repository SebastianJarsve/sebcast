import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { randomUUID } from "crypto";
import { useMemo, useRef, useState } from "react";
import { Commands } from "../items";
import { Item } from "../types";

type NewItem = Omit<Item, "id">;

function NewCommand({ commands, current }: { commands: Commands; current?: Item }) {
  const { pop } = useNavigation();
  const { value: items, setValue: setItems, isLoading } = commands;
  const form = useForm<NewItem>({
    initialValues: current,
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `"${values.title}" item created`,
      });
      console.log(values);
      if (items === undefined) return false;
      if (current) {
        const newItems = items.map((item) => (item.id === current.id ? { ...values, id: current.id } : item));
        setItems(newItems);
      } else {
        setItems([...items, { id: randomUUID(), ...values }]);
      }
      pop();
    },
    validation: {
      title: FormValidation.Required,
      command: FormValidation.Required,
    },
  });
  const allTags = useMemo(() => {
    return items?.reduce((acc, curr) => {
      if (curr.tags) {
        curr.tags.forEach((tag) => {
          if (acc.includes(tag)) return;
          acc.push(tag);
        });
      }
      return acc;
    }, [] as string[]);
  }, [items]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const createTagRef = useRef<Form.TextField>(null);
  console.log(createTagRef);
  return (
    <Form
      navigationTitle="New command"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={form.handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="* Title" placeholder="Title" {...form.itemProps.title} />
      <Form.TextArea title="* Command" placeholder="Command" {...form.itemProps.command} />
      <Form.TextArea title="Notes" placeholder="Markdown notes" enableMarkdown {...form.itemProps.notes} />
      <Form.Dropdown title="Icon" placeholder="Icon" {...form.itemProps.icon}>
        {Object.entries(Icon).map(([key, val]) => (
          <Form.Dropdown.Item key={key} value={val} title={key} icon={val} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        ref={createTagRef}
        // info="Create new tags here if they don't exist. End with comma to create."
        info="Add missing tags to the TagPicker below. Create the tag with a comma. This is needed, because of the limited API in the Form.TagPicker."
        id="tags2"
        title="Create tags"
        placeholder="My new tag"
        onChange={(val) => {
          if (val.endsWith(",") && val.length > 1) {
            const newTag = val.slice(0, -1);
            if (!customTags.includes(newTag)) {
              setCustomTags([...customTags, val.slice(0, -1)]);
              createTagRef.current?.reset();
              showToast({ title: `Tag "${newTag}" added as an option below.` });
            }
          }
        }}
      />

      <Form.TagPicker title="Select tags" placeholder="Tags" {...form.itemProps.tags}>
        {allTags?.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag}></Form.TagPicker.Item>
        ))}
        {customTags?.map((tag) => (
          <Form.TagPicker.Item key={`custom-${tag}`} title={tag} value={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export { NewCommand };
