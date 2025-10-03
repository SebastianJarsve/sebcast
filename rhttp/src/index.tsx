import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import {
  $collections,
  $currentCollectionId,
  deleteCollection,
  deleteRequest,
  initializeDefaultCollection,
  moveRequest,
} from "./store";
import { CollectionForm } from "~/views/collection-form";
import { RequestForm } from "~/views/request-form";
import { Collection, Request } from "~/types";
import { $currentEnvironmentId, $environments, initializeDefaultEnvironment } from "~/store/environments";
import { CollectionActions, GlobalActions, NewRequestFromCurlAction } from "~/components/actions";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { DEFAULT_COLLECTION_NAME } from "~/constants";
import { generateCurlCommand } from "./utils/curl-to-request";
import { $cookies } from "./store/cookies";
import { $history } from "./store/history";
import { useEffect, useState } from "react";
import { PersistentAtom } from "@sebastianjarsve/persistent-atom/.";
import { useRunRequest } from "./hooks/use-run-request";

/**
 * CommonActions contains view-specific actions that need to be available
 * in both the List's default ActionPanel and individual List.Item ActionPanels.
 *
 * This is necessary because Raycast's List.Item ActionPanel completely overrides
 * the List's ActionPanel, so we need to explicitly include these in both places.
 *
 * For truly global actions available everywhere, see GlobalActions in ~/components/actions.tsx
 */
function CommonActions({ currentCollection: currentCollection }: { currentCollection: Collection | null }) {
  return (
    <>
      {currentCollection && (
        <Action.Push
          key={"new-request"}
          title="New Request"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<RequestForm collectionId={currentCollection.id} request={{}} />}
          icon={Icon.PlusCircle}
        />
      )}
      <NewRequestFromCurlAction />

      <CollectionActions>
        {currentCollection && currentCollection.title !== DEFAULT_COLLECTION_NAME && (
          <Action.Push
            key={"edit-request"}
            title="Edit Collection"
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            target={<CollectionForm collectionId={currentCollection.id} />}
            icon={Icon.Pencil}
          />
        )}
      </CollectionActions>
      <Action.Push
        key={"create-request"}
        title="Create Collection"
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<CollectionForm />}
        icon={Icon.PlusTopRightSquare}
      />
      {currentCollection && (
        <Action
          title="Delete Collection"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          onAction={async () => {
            if (
              await confirmAlert({
                title: `Delete "${currentCollection.title}"?`,
                message: "Are you sure? All requests within this collection will also be deleted.",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              })
            ) {
              await deleteCollection(currentCollection.id);
              await showToast({ style: Toast.Style.Success, title: "Collection Deleted" });
            }
          }}
        />
      )}
    </>
  );
}

export function CollectionDropdown() {
  const { value: collections } = useAtom($collections);
  const { value: currentId } = useAtom($currentCollectionId);

  return (
    <List.Dropdown
      tooltip="Select Collection"
      value={currentId ?? undefined}
      onChange={(newValue) => {
        // 1. Find the collection that was just selected using `newValue`.
        const newCollection = collections.find((c) => c.id === newValue);

        // 2. Set the active environment based on the NEW collection's preference.
        $currentEnvironmentId.set(newCollection?.lastActiveEnvironmentId ?? null);

        // 3. Set the current collection ID to the new value.
        $currentCollectionId.set(newValue);
      }}
    >
      <List.Dropdown.Section title="Collections">
        {collections.map((c) => {
          return <List.Dropdown.Item key={c.id} title={c.title} value={c.id} />;
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function useStoresReady(atoms: PersistentAtom<any>[]) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkReady() {
      // Wait for all the provided atoms to finish their hydration
      await Promise.all(atoms.map((atom) => atom.ready));
      setIsReady(true);
    }
    checkReady();
  }, []); // The empty array ensures this runs only once

  return isReady;
}

async function initializeApp() {
  // Use Promise.allSettled to wait for all promises, even if some fail.
  const stores = [
    { atom: $collections, name: "Collections" },
    { atom: $environments, name: "Environments" },
    { atom: $cookies, name: "Cookies" },
    { atom: $history, name: "History" },
  ];

  const results = await Promise.allSettled(stores.map((s) => s.atom.ready));

  // Check if any of the hydration promises were rejected.
  const failedStores = results
    .map((result, index) => ({ result, store: stores[index].name }))
    .filter(({ result }) => result.status === "rejected");
  if (failedStores.length > 0) {
    const storeList = failedStores.map(({ store }) => store).join(", ");
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Some Data",
      message: `Failed stores: ${storeList}`,
    });
  }

  // Now, proceed with initialization. This will create defaults for any
  // stores that failed to load and are currently empty.
  initializeDefaultCollection();
  initializeDefaultEnvironment();
}

interface RequestListItemProps {
  request: Request;
  currentCollection: Collection;
  collections: readonly Collection[];
}

function RequestListItem({ request, currentCollection, collections }: RequestListItemProps) {
  const { execute: run } = useRunRequest();

  return (
    <List.Item
      key={request.id}
      title={request.title ?? request.url}
      actions={
        <ActionPanel>
          <Action.Push
            key={"edit-request"}
            title="Open request"
            icon={Icon.ChevronRight}
            target={<RequestForm collectionId={currentCollection.id} request={request} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Run request"
            icon={Icon.Bolt}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => run(request, currentCollection)}
          />
          <Action.CopyToClipboard
            title="Copy as cURL"
            icon={Icon.Terminal}
            content={generateCurlCommand(request, currentCollection)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CommonActions currentCollection={currentCollection} />
          <ActionPanel.Submenu
            title="Move request to another collection"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          >
            {collections.map((c) => (
              <Action
                key={`col-${c.id}`}
                title={`Move to "${c.title}"`}
                onAction={() => moveRequest(request.id, currentCollection.id, c.id)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action
            title="Delete Request"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Delete Request?",
                  message: "Are you sure you want to delete this request? This cannot be undone.",
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await deleteRequest(currentCollection.id, request.id);
                await showToast({ style: Toast.Style.Success, title: "Request Deleted" });
              }
            }}
          />
          <GlobalActions />
        </ActionPanel>
      }
    />
  );
}

export default function RequestList() {
  useEffect(() => {
    initializeApp();
  }, []);

  const isReady = useStoresReady([
    $collections,
    $currentCollectionId,
    $environments,
    $currentEnvironmentId,
    $history,
    $cookies,
  ]);

  const { isLoading } = useRunRequest();

  const { value: collections } = useAtom($collections);
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: environments } = useAtom($environments);
  const currentEnvironment = environments.find((e) => e.id === currentEnvironmentId);
  return (
    <List
      isLoading={!isReady || isLoading}
      navigationTitle={`Environment = ${currentEnvironment?.name}`}
      searchBarPlaceholder="Search requests..."
      searchBarAccessory={<CollectionDropdown />}
      actions={
        <ActionPanel>
          {currentCollection && <CommonActions currentCollection={currentCollection} />}
          <GlobalActions />
        </ActionPanel>
      }
    >
      {currentCollection?.requests?.map((request) => {
        return (
          <RequestListItem
            key={request.id}
            request={request}
            currentCollection={currentCollection}
            collections={collections}
          />
        );
      })}
    </List>
  );
}
