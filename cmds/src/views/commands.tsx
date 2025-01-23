import { Action, ActionPanel, Alert, Clipboard, Icon, List, confirmAlert, showToast } from "@raycast/api";
import Fuse from "fuse.js";
import { useCallback, useState } from "react";
import { Commands } from "../items";
import { Item, Items } from "../types";
import { importData } from "../utils/import";
import { NewCommand } from "./new-commands";
import { TemplateForm } from "./template-form";

function AllCommands(commands: Commands) {
  const { value: items, isLoading, setValue } = commands;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const toggleDetails = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  const fuse = new Fuse<Item>(items || [], { keys: ["title", "command", "notes"] });
  const filteredItems = query ? fuse.search(query).map((result) => result.item) : items;

  const exportItems = useCallback(async () => {
    Clipboard.copy(JSON.stringify(items, null, 2));
    await showToast({ title: "Exported", message: "Copied to clipboard as JSON." });
  }, [items]);

  const importItems = (newItems: Items) => {
    // Include old items when using setValue
    if (items) setValue([...items, ...newItems]);
  };

  return (
    <List
      isLoading={isLoading}
      filtering={false} // Filtered with fuse.js
      onSearchTextChange={setQuery}
      isShowingDetail={isOpen}
      actions={
        <ActionPanel>
          <Action
            title="Import"
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={() => importData(importItems)}
          />
          <Action.Push
            title="New item"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<NewCommand commands={commands} />}
          />
        </ActionPanel>
      }
    >
      {items !== undefined &&
        filteredItems?.map((item) => {
          const isTemplate = Boolean(item.command.match(/\{.*\}/));
          return (
            <List.Item
              key={item.title}
              icon={item.icon ?? Icon.Circle}
              title={item.title}
              subtitle={item.tags?.toString()}
              detail={
                <List.Item.Detail markdown={`## ${item.title} \n\n \`${item.command}\` \n\n ${item.notes || ""}`} />
              }
              actions={
                <ActionPanel>
                  {isTemplate && (
                    <Action.Push
                      icon={Icon.TextInput}
                      title="Fill out template"
                      target={<TemplateForm item={item} />}
                    />
                  )}
                  <Action
                    title="Paste at cursor"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: [], key: "return" }}
                    onAction={() => Clipboard.paste(item.command)}
                  />
                  <Action.CopyToClipboard
                    title="Copy to clipboard"
                    content={item.command}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />

                  <Action
                    title="Export all items to clipboard"
                    icon={Icon.CodeBlock}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={exportItems}
                  />
                  <Action
                    title={"Details"}
                    icon={Icon.MagnifyingGlass}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={toggleDetails}
                  />
                  <Action.Push
                    title="New item"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<NewCommand commands={commands} />}
                  />
                  <Action.Push
                    title="Edit item"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<NewCommand commands={commands} current={item} />}
                  />
                  <Action
                    title="Delete item"
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure you want to delete this item?",
                          message: `"${item.title}"`,
                          primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
                          icon: Icon.Trash,
                        })
                      ) {
                        setValue(items.filter((i) => i.id !== item.id));
                      }
                    }}
                  />
                  <Action
                    title="Delete all items"
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure you want to delete all the items?",
                          message: "This cannot be undone.",
                          primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
                          icon: Icon.Trash,
                        })
                      ) {
                        setValue([]);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

export { AllCommands };
