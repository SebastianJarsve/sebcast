// src/views/HistoryView.tsx
import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { $history, deleteHistoryEntry, clearHistory } from "../store/history";
import { runRequest } from "../utils";
import { ResponseView } from "./response";
import { HistoryEntry, Method, ResponseData } from "../types";
import { $collections, useAtom } from "../store";
import axios from "axios";
import { ErrorDetail } from "./error-view";
import { z } from "zod";
import { METHODS } from "../constants";

// Helper function to get a color for the status code accessory
function getStatusAccessory(status: number): List.Item.Accessory {
  let color = Color.PrimaryText;
  if (status >= 500) color = Color.Red;
  else if (status >= 400) color = Color.Red;
  else if (status >= 300) color = Color.Orange;
  else if (status >= 200) color = Color.Green;
  return { tag: { value: String(status), color } };
}

function getMethodAccessory(method: Method): List.Item.Accessory {
  const color = METHODS[method]?.color ?? Color.PrimaryText;
  return { tag: { value: method, color } };
}

interface HistoryViewProps {
  // Add an optional prop to filter the history
  filterByRequestId?: string;
}

export function HistoryView({ filterByRequestId }: HistoryViewProps) {
  const { push } = useNavigation();
  const { value: allHistory } = useAtom($history);
  const { value: collections } = useAtom($collections);
  const history = filterByRequestId
    ? allHistory.filter((entry) => entry.sourceRequestId === filterByRequestId)
    : allHistory;

  const navigationTitle = filterByRequestId ? "Run History for Request" : "Request History";

  return (
    <List
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action
            title="Clear All History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Clear All History?",
                  message: "This will permanently delete all saved request entries.",
                  primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
                })
              ) {
                clearHistory();
                showToast({ title: "History Cleared" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      {history.length === 0 ? (
        <List.EmptyView title="No History Found" description="Run some requests to see their history here." />
      ) : (
        history.map((entry: HistoryEntry) => (
          <List.Item
            key={entry.id}
            title={entry.requestSnapshot.title ?? entry.requestSnapshot.url}
            subtitle={new Date(entry.createdAt).toLocaleString()}
            accessories={[getMethodAccessory(entry.requestSnapshot.method), getStatusAccessory(entry.response.status)]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Full Response"
                  icon={Icon.Eye}
                  target={
                    <ResponseView
                      request={entry.requestSnapshot}
                      sourceRequestId={entry.sourceRequestId}
                      response={entry.response}
                    />
                  }
                />
                <Action
                  title="Re-run Request"
                  icon={Icon.Bolt}
                  onAction={async () => {
                    const toast = await showToast({ style: Toast.Style.Animated, title: "Re-running request..." });

                    // 1. Find the original collection to get its context (e.g., global headers)
                    const sourceCollection = collections.find((c) =>
                      c.requests.some((r) => r.id === entry.sourceRequestId),
                    );

                    if (!sourceCollection) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to Re-run";
                      toast.message = "Original collection could not be found.";
                      return;
                    }

                    try {
                      // 2. Re-run the request using the snapshot and the original collection
                      const response = await runRequest(entry.requestSnapshot, sourceCollection);
                      toast.hide();

                      const responseData: ResponseData = {
                        requestMethod: entry.requestSnapshot.method,
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers as Record<string, string>,
                        body: response.data,
                      };

                      push(
                        <ResponseView
                          request={entry.requestSnapshot}
                          sourceRequestId={entry.sourceRequestId}
                          response={responseData}
                        />,
                      );
                    } catch (error) {
                      // 3. Handle errors just like our other run actions
                      toast.hide();
                      if (axios.isAxiosError(error) && error.response) {
                        push(
                          <ResponseView
                            sourceRequestId={entry.sourceRequestId}
                            request={entry.requestSnapshot}
                            response={{
                              requestMethod: entry.requestSnapshot.method,
                              status: error.response.status,
                              statusText: error.response.statusText,
                              headers: error.response.headers as Record<string, string>,
                              body: error.response.data,
                            }}
                          />,
                        );
                      } else if (error instanceof z.ZodError) {
                        toast.hide();
                        // This is a validation error from our schema -> Show the ErrorDetail view
                        push(<ErrorDetail error={error} />);
                      } else if (axios.isAxiosError(error) && error.code === "ENOTFOUND") {
                        // This is a DNS/network error, which often means a VPN isn't connected.
                        toast.style = Toast.Style.Failure;
                        toast.title = "Host Not Found";
                        toast.message = "Check your internet or VPN connection.";
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
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Delete Entry?",
                        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      deleteHistoryEntry(entry.id);
                      showToast({ style: Toast.Style.Success, title: "Entry Deleted" });
                    }
                  }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Clear All History"
                    // ... (same as the global action)
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
