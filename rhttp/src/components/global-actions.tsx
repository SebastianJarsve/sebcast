import { Action, ActionPanel, Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { $currentCollection, createCollection, useAtom } from "../store";
import { $currentEnvironment, $currentEnvironmentId, $environments } from "../store/environments";
import { ManageVariablesList } from "../views/manage-variables-list";
import { HistoryView } from "../views/history-list-view";
import { $isHistoryEnabled } from "../store/settings";
import { newCollectionSchema } from "../types";

function SelectEnvironmentMenu() {
  const { value: currentEnvironment } = useAtom($currentEnvironment);
  const { value: allEnvironments } = useAtom($environments);
  return (
    <ActionPanel.Submenu
      title="Select environment"
      icon={Icon.Key}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      {allEnvironments.map((env) => (
        <Action
          key={env.id}
          title={(currentEnvironment?.id === env.id ? `✅ ` : "") + env.name}
          onAction={() => $currentEnvironmentId?.set(env?.id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function GlobalActions() {
  const { value: isHistoryEnabled } = useAtom($isHistoryEnabled);
  const { value: currentCollection } = useAtom($currentCollection);
  return (
    <>
      <ActionPanel.Section title="Environment">
        <SelectEnvironmentMenu />

        <Action.Push
          title="Manage Environments"
          icon={Icon.Pencil}
          target={<ManageVariablesList />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="History">
        <Action.Push
          title="View History"
          icon={Icon.Clock}
          target={<HistoryView />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
        <Action
          title={isHistoryEnabled ? "Disable History" : "Enable History"}
          icon={isHistoryEnabled ? Icon.Stop : Icon.Clock}
          onAction={() => {
            showToast({ title: !isHistoryEnabled ? "Recording history" : "Stopped recording history" });
            $isHistoryEnabled.set(!isHistoryEnabled);
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Collection">
        {currentCollection && (
          <Action
            title="Export Collection"
            icon={Icon.Upload}
            onAction={async () => {
              try {
                // We use our Zod schema to validate and strip the IDs, preparing it for export.
                const exportableCollection = newCollectionSchema.parse(currentCollection);
                const jsonString = JSON.stringify(exportableCollection, null, 2);
                await Clipboard.copy(jsonString);
                await showToast({ title: "Collection Copied to Clipboard" });
              } catch (error) {
                await showToast({ style: Toast.Style.Failure, title: "Failed to Export" });
              }
            }}
          />
        )}
        <Action
          title="Import Collection from Clipboard"
          icon={Icon.Download}
          onAction={async () => {
            try {
              const clipboardText = await Clipboard.readText();
              if (!clipboardText) {
                throw new Error("Clipboard is empty.");
              }
              const data = JSON.parse(clipboardText);
              // Validate the clipboard data against our schema
              const newCollectionData = newCollectionSchema.parse(data);
              await createCollection(newCollectionData);
              await showToast({ title: "Collection Imported Successfully" });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Import Failed",
                message: "Clipboard does not contain a valid collection.",
              });
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
