import {
  Action,
  ActionPanel,
  Clipboard,
  environment,
  getPreferenceValues,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { $collections, $currentCollectionId, createCollection, updateCollection } from "../store";
import { $currentEnvironmentId, $environments } from "../store/environments";
import { ManageVariablesList } from "../views/manage-variables-list";
import { HistoryView } from "../views/history-list-view";
import { $isHistoryEnabled } from "../store/settings";
import { collectionSchema, environmentsSchema, historySchema, newCollectionSchema } from "../types";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { parseCurlToRequest } from "~/utils/curl-to-request";
import { RequestForm } from "~/views/request-form";
import { resolveVariables } from "~/utils";
import { PropsWithChildren } from "react";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { randomUUID } from "crypto";
import z from "zod";
import { backupAllData, exportAtomToFile } from "~/utils/backup";
import { $history } from "~/store/history";

async function handleSelectEnvironment(envId: string) {
  const currentCollectionId = $currentCollectionId.get();
  if (currentCollectionId) {
    await updateCollection(currentCollectionId, { lastActiveEnvironmentId: envId });
  }
  $currentEnvironmentId.set(envId);
}

export function SelectEnvironmentMenu() {
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: allEnvironments } = useAtom($environments);
  const currentEnvironment = allEnvironments.find((e) => e.id === currentEnvironmentId);
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
          onAction={() => {
            handleSelectEnvironment(env.id);
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function EnvironmentActions() {
  return (
    <>
      <SelectEnvironmentMenu />

      <Action.Push
        title="Manage Environments"
        icon={Icon.Pencil}
        target={<ManageVariablesList />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      />
    </>
  );
}

export function HistoryActions() {
  const { value: isHistoryEnabled } = useAtom($isHistoryEnabled);
  return (
    <>
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
    </>
  );
}

export function CollectionActions({ children }: PropsWithChildren) {
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: collections } = useAtom($collections);
  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  return (
    <ActionPanel.Section title="Collection">
      {children}
      {currentCollection && (
        <Action
          title="Export Collection"
          icon={Icon.Upload}
          onAction={async () => {
            try {
              // We use our Zod schema to validate and strip the IDs, preparing it for export.
              console.log(currentCollection);
              const exportableCollection = newCollectionSchema.parse(currentCollection);
              const jsonString = JSON.stringify(exportableCollection, null, 2);
              await Clipboard.copy(jsonString);
              await showToast({ title: "Collection Copied to Clipboard" });
            } catch (error) {
              console.error(error);
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
  );
}

export function CopyVariableAction() {
  const resolvedVariables = resolveVariables();
  const variableKeys = Object.keys(resolvedVariables);

  return (
    <ActionPanel.Submenu title="Copy Variable" icon={Icon.Key} shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}>
      {variableKeys.length > 0 ? (
        variableKeys.map((key) => (
          <Action
            key={key}
            title={key}
            onAction={async () => {
              const content = `{{${key}}}`;
              await Clipboard.copy(content);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied Placeholder",
              });
            }}
          />
        ))
      ) : (
        <Action title="No Variables in Scope" />
      )}
    </ActionPanel.Submenu>
  );
}

export function NewRequestFromCurlAction() {
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: collections } = useAtom($collections);
  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  const { push } = useNavigation();
  return (
    <Action
      title="New Request from cURL"
      icon={Icon.Clipboard}
      onAction={async () => {
        if (!currentCollection) {
          await showToast({ style: Toast.Style.Failure, title: "No Collection Selected" });
          return;
        }
        try {
          const clipboardText = await Clipboard.readText();
          if (!clipboardText?.startsWith("curl")) {
            throw new Error("Clipboard does not contain a cURL command.");
          }
          const parsedRequest = parseCurlToRequest(clipboardText);
          if (!parsedRequest) {
            throw new Error("Could not parse the cURL command.");
          }
          // Push the form, pre-filled with the parsed data
          push(<RequestForm collectionId={currentCollection.id} request={parsedRequest} />);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Import Failed",
            message: String(error),
          });
        }
      }}
    />
  );
}

export function OpenInEditorAction({ responseBody }: { responseBody: string }) {
  return (
    <Action
      title="Open Response in Editor"
      icon={Icon.Code}
      onAction={async () => {
        const tempPath = path.join(os.tmpdir(), `response-${randomUUID()}.json`);
        await fs.writeFile(tempPath, responseBody);

        // Get the editor name from your extension's preferences
        const { preferredEditor } = getPreferenceValues<{ preferredEditor: string }>();

        // The `open` command can take an application name as a second argument.
        // If the preference is empty, it will be `undefined` and `open` will use the system default.
        await open(tempPath, preferredEditor || undefined);
      }}
    />
  );
}

export function GlobalActions() {
  return (
    <ActionPanel.Section title="Global Actions">
      <EnvironmentActions />
      <HistoryActions />
      <Action
        title="Backup All Data"
        icon={Icon.HardDrive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        onAction={async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Creating backup..." });
          try {
            await backupAllData();
            toast.style = Toast.Style.Success;
            toast.title = "Backup Successful";
            toast.message = "Files saved in a new timestamped folder.";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Backup Failed";
            toast.message = String(error);
          }
        }}
      />
    </ActionPanel.Section>
  );
}
