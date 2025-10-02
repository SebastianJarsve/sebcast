import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { NewRequest, Request, Headers, Method, ResponseAction, Collection } from "../types";
import { $collections, $currentCollectionId, createRequest, updateRequest } from "../store";
import { COMMON_HEADER_KEYS, METHODS } from "~/constants";
import { z, ZodIssueCode } from "zod";
import { ErrorDetail } from "./error-view";
import { runRequest } from "~/utils";
import { ResponseView } from "./response";
import axios from "axios";
import { randomUUID } from "crypto";
import { ResponseActionsEditor } from "~/components/response-actions-editor";
import { KeyValueEditor } from "~/components/key-value-editor";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { CopyVariableAction, GlobalActions } from "~/components/actions";
import { $currentEnvironmentId, $environments } from "~/store/environments";

interface RequestFormProps {
  collectionId: string;
  request: Partial<Request>;
}

function useRunRequest() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (request: Request, collection: Collection) => {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running request..." });
    try {
      // 2. Call our utility function
      if (!collection) return;
      const response = await runRequest(request, collection);

      // 3. On success, hide the toast and push the response view
      toast.hide();
      if (!response) throw response;
      push(
        <ResponseView
          sourceRequestId={request.id}
          requestSnapshot={request}
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
            requestSnapshot={request}
            response={{
              requestMethod: request.method,
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
    } finally {
      setIsLoading(false);
    }
  };
  return { execute, isLoading };
}

export function RequestForm({ collectionId, request: initialRequest }: RequestFormProps) {
  const { push } = useNavigation();
  const { execute: run, isLoading: isRunning } = useRunRequest();
  const { value: collections } = useAtom($collections);
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: environments } = useAtom($environments);

  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  const currentEnvironment = environments.find((e) => e.id === currentEnvironmentId);

  const [isSaving, setIsSaving] = useState(false);
  const [dirtyRequest, setDirtyRequest] = useState<Request>({
    id: initialRequest.id ?? randomUUID(),
    title: initialRequest.title ?? "",
    url: initialRequest.url ?? "",
    method: initialRequest.method ?? "GET",
    headers: initialRequest.headers ?? [],
    body: initialRequest.body ?? "",
    bodyType: initialRequest.bodyType ?? "NONE",
    params: initialRequest.params ?? "",
    query: initialRequest.query ?? "",
    responseActions: initialRequest.responseActions ?? [],
  });

  const request = initialRequest;

  const [activeHeaderIndex, setActiveHeaderIndex] = useState<number | null>(null);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);

  async function handleRun() {
    if (!currentCollection) return;
    run(dirtyRequest, currentCollection);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (initialRequest.id) {
        await updateRequest(collectionId, dirtyRequest.id, dirtyRequest);
        showToast({ title: "Request Updated" });
      } else {
        await createRequest(collectionId, dirtyRequest as NewRequest);
        showToast({ title: "Request Created" });
      }
      // pop();
    } catch (error) {
      // This block runs if Zod's .parse() throws an error.
      if (error instanceof z.ZodError) {
        // We can format a user-friendly message from the Zod error.
        push(<ErrorDetail error={error} />);
      } else {
        // Handle other unexpected errors.
        showToast({
          style: Toast.Style.Failure,
          title: "An unknown error occurred",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isRunning || isSaving}
      navigationTitle={`Environment = ${currentEnvironment?.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Request" icon={Icon.Bolt} onSubmit={handleRun} />
          <Action.SubmitForm
            title="Save Request"
            icon={Icon.HardDrive}
            onSubmit={handleSave}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />

          <CopyVariableAction />

          <ActionPanel.Section title="Form Actions">
            <Action
              title="Add Header"
              icon={Icon.Plus}
              onAction={() => setDirtyRequest((old) => ({ ...old, headers: [...old.headers, { key: "", value: "" }] }))}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            {activeHeaderIndex !== null && (
              <Action
                title="Remove Header"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  if (activeHeaderIndex === null) return;
                  // setHeaders(headers.filter((_, i) => i !== activeIndex));
                  setDirtyRequest((old) => ({
                    ...old,
                    headers: old.headers.filter((_, i) => i !== activeHeaderIndex),
                  }));
                  setActiveHeaderIndex(null);
                  showToast({ style: Toast.Style.Success, title: "Header Removed" });
                }}
                shortcut={{ modifiers: ["ctrl"], key: "h" }}
              />
            )}
            <Action
              title="Add Response Action"
              icon={Icon.Plus}
              onAction={() =>
                setDirtyRequest((old) => ({
                  ...old,
                  responseActions: [
                    ...(old.responseActions || []),
                    { id: randomUUID(), source: "BODY_JSON", sourcePath: "", variableKey: "" },
                  ],
                }))
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            {activeActionIndex !== null && (
              <Action
                title="Remove Response Action"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  setDirtyRequest((old) => ({
                    ...old,
                    responseActions: old.responseActions?.filter((_, i) => i !== activeActionIndex),
                  }));
                  showToast({ style: Toast.Style.Success, title: "Action Removed" });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            )}
          </ActionPanel.Section>
          <GlobalActions />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`Collection: ${currentCollection?.title ?? ""}`}
        text={`Environment: ${currentEnvironment?.name ?? ""}`}
      />
      <Form.Dropdown
        id="method"
        title="HTTP Method"
        value={dirtyRequest.method}
        onChange={(newValue) => setDirtyRequest((old) => ({ ...old, method: newValue as Method }))}
      >
        {Object.keys(METHODS).map((m) => (
          <Form.Dropdown.Item
            key={m}
            value={m}
            title={m}
            icon={{
              source: Icon.Circle,
              tintColor: METHODS[m as keyof typeof METHODS].color,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="e.g., Get All Users" defaultValue={request?.title} />
      <Form.TextField
        id="url"
        title="URL / Path"
        placeholder="/users or https://api.example.com"
        defaultValue={request?.url}
      />

      {(["POST", "PUT", "PATCH"] as Array<Method | undefined>).includes(dirtyRequest.method) && (
        <Form.Dropdown id="bodyType" defaultValue="JSON" title="Body type" info="">
          <Form.Dropdown.Item title="NONE" value="NONE" />
          <Form.Dropdown.Item title="JSON" value="JSON" />
          <Form.Dropdown.Item title="FORM_DATA" value="FORM_DATA" />
        </Form.Dropdown>
      )}
      {/* Conditional fields for Body, Params, etc. */}
      {dirtyRequest.method && ["POST", "PUT", "PATCH"].includes(dirtyRequest.method) && (
        <Form.TextArea id="body" title="Body" placeholder="Enter JSON body" defaultValue={request?.body} />
      )}

      {/* Show Params field for GET */}
      {dirtyRequest.method === "GET" && (
        <Form.TextArea
          id="params"
          title="Params"
          placeholder="Enter params as a JSON object"
          defaultValue={request?.params}
        />
      )}

      {/* Show Query and Variables fields for GraphQL */}
      {dirtyRequest.method === "GRAPHQL" && (
        <>
          <Form.TextArea id="query" title="Query" placeholder="Enter GraphQL query" defaultValue={request?.query} />
          <Form.TextArea
            id="variables"
            title="Variables"
            placeholder="Enter variables as a JSON object"
            defaultValue={request?.variables}
          />
        </>
      )}

      {dirtyRequest.headers.length > 0 && (
        <>
          <Form.Separator />
          <KeyValueEditor
            onActiveIndexChange={setActiveHeaderIndex}
            title="Headers"
            pairs={dirtyRequest.headers}
            onPairsChange={(newPairs) => setDirtyRequest((old) => ({ ...old, headers: newPairs }))}
            commonKeys={COMMON_HEADER_KEYS}
          />
        </>
      )}

      <Form.Separator />
      <Form.Description text="Response Actions" />

      <ResponseActionsEditor
        actions={dirtyRequest.responseActions ?? []}
        onActionsChange={(newActions) => setDirtyRequest((prev) => ({ ...prev, responseActions: newActions }))}
        onActiveIndexChange={setActiveActionIndex}
      />
    </Form>
  );
}
