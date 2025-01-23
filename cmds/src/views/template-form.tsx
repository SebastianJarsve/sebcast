import { Action, ActionPanel, Clipboard, Form, Icon, PopToRootType, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Item } from "../types";

const reAttrs = /(?<!\\){(?:\\.|[^\\})]+)*}/g;
function TemplateForm({ item }: { item: Item }) {
  const template = item.command;
  const [isLoading, setIsLoading] = useState(true);
  const [attributes, setAttributes] = useState<string[]>([]);

  useEffect(() => {
    const matches = [...template.matchAll(reAttrs)].map((match) => match[0]);
    setAttributes(matches);
    setIsLoading(false);
  }, [template]);

  function replaceAttributes(values: { [key: string]: string }) {
    const matches = Object.entries(values)
      .sort((a, b) => (parseInt(a[0]) > parseInt(b[0]) ? 1 : -1))
      .map((m) => m[1]);
    const modifiedTemplate = template.replaceAll(reAttrs, (substring) => {
      return matches.shift() || substring; // Replace with the form field values, if they're not empty
    });
    return modifiedTemplate;
  }

  return (
    <Form
      navigationTitle={item.title}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Past in Active App"
            icon={Icon.Clipboard}
            onSubmit={(values) => {
              const text = replaceAttributes(values);
              Clipboard.paste(text);
              showHUD("Command pasted");
            }}
          />
          <Action.SubmitForm
            title="Copy to clipboard"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onSubmit={(values) => {
              const text = replaceAttributes(values);
              Clipboard.copy(text);
              showHUD("Command copied");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={item.command} />
      /clog
      {attributes.map((attr, i) => (
        <Form.TextField id={String(i)} key={attr + i} title={attr.slice(1, -1)} />
      ))}
    </Form>
  );
}

export { TemplateForm };
