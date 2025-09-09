import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import {
  $collections,
  $currentCollection,
  $currentCollectionId,
  deleteCollection,
  deleteRequest,
  useAtom,
} from "./store";
import { CollectionForm } from "./views/collection-form";
import { RequestForm } from "./views/request-form";
import { Collection } from "./types";
import { runRequest } from "./utils";
import { ResponseView } from "./views/response";
import axios from "axios";
import { SecretsActions } from "./components/secrets-actions";

function GlobalActions({ currentCollection: currentCollection }: { currentCollection: Collection | null }) {
  return (
    <>
      {currentCollection && (
        <Action.Push
          key={"new-request"}
          title="New Request"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<RequestForm collectionId={currentCollection.id} />}
        />
      )}
      {currentCollection && (
        <Action.Push
          key={"edit-request"}
          title="Edit Collection"
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          target={<CollectionForm collectionId={currentCollection.id} />}
        />
      )}
      <Action.Push
        key={"create-request"}
        title="Create Collection"
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<CollectionForm />}
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
      value={currentId ?? undefined} // Use the ID from the store
      onChange={(newValue) => {
        // 2. Update the global store directly. This is the key!
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

export default function () {
  const { value: currentCollection } = useAtom($currentCollection);
  const { push } = useNavigation();

  return (
    <List
      navigationTitle="Requests"
      searchBarPlaceholder="Search requests..."
      searchBarAccessory={<CollectionDropdown />}
      actions={
        <ActionPanel>
          <GlobalActions currentCollection={currentCollection} />
          <SecretsActions />
        </ActionPanel>
      }
    >
      {currentCollection &&
        currentCollection.requests?.map((request) => (
          <List.Item
            key={request.id}
            title={request.title ?? request.url}
            actions={
              <ActionPanel>
                <Action.Push
                  key={"edit-request"}
                  title="Open request"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<RequestForm collectionId={currentCollection.id} requestId={request.id} />}
                />
                <Action
                  title="Run request"
                  icon={Icon.Bolt}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={async () => {
                    // 1. Show a loading toast
                    const toast = await showToast({ style: Toast.Style.Animated, title: "Running request..." });
                    try {
                      // 2. Call our utility function
                      const response = await runRequest(request, currentCollection);
                      console.log(response);

                      // 3. On success, hide the toast and push the response view
                      toast.hide();
                      if (!response) throw "Response is undefined";
                      push(
                        <ResponseView
                          response={{
                            requestMethod: request.method,
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers as Record<string, string>,
                            body: response.data,
                          }}
                        />,
                      );
                    } catch (error) {
                      // Check if it's an Axios error with a response from the server
                      if (axios.isAxiosError(error) && error.response) {
                        // This is an API error (e.g., 404, 500). Show the detailed view.
                        toast.hide();
                        push(
                          <ResponseView
                            response={{
                              requestMethod: request.method,
                              status: error.response.status,
                              statusText: error.response.statusText,
                              headers: error.response.headers as Record<string, string>,
                              body: error.response.data,
                            }}
                          />,
                        );
                      } else {
                        // This is a network error (e.g., connection refused) or another issue.
                        // For these, a toast is appropriate.
                        toast.style = Toast.Style.Failure;
                        toast.title = "Request Failed";
                        toast.message = String(error);
                      }
                    }
                  }}
                />
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
                      await deleteRequest(currentCollection!.id, request.id);
                      await showToast({ style: Toast.Style.Success, title: "Request Deleted" });
                    }
                  }}
                />
                <ActionPanel.Section title="Global Actions" key={"global-actions-section"}>
                  <GlobalActions currentCollection={currentCollection} />
                </ActionPanel.Section>
                <SecretsActions />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
