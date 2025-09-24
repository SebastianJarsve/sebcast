// RequestForm.tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { NewRequest, Request, Headers, Method, ResponseAction } from "../types";
import { $currentCollection, createRequest, updateRequest } from "../store";
import { COMMON_HEADER_KEYS, METHODS } from "../constants"; // Assuming you have a constants file for METHODS etc.
import { z } from "zod";
import { ErrorDetail } from "./error-view";
import { runRequest } from "../utils";
import { ResponseView } from "./response";
import axios from "axios";
import { $currentEnvironment } from "../store/environments";
import { randomUUID } from "crypto";
import { ResponseActionsEditor } from "../components/response-actions-editor";
import { KeyValueEditor } from "../components/key-value-editor";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { CopyVariableAction, GlobalActions } from "~/components/actions";

interface RequestFormProps {
  collectionId: string;
  // requestId?: string;
  request: Partial<Request>;
}

export function RequestForm({ collectionId, request: initialRequest }: RequestFormProps) {
  const { push } = useNavigation();
  const { value: currentCollection } = useAtom($currentCollection);
  const { value: currentEnvironment } = useAtom($currentEnvironment);

  const request = initialRequest;
  const [currentRequestId, setCurrentRequestId] = useState(initialRequest.id);
  const [isSaving, setIsSaving] = useState(false);

  const [method, setMethod] = useState(request?.method);
  const [headers, setHeaders] = useState<Headers>(request?.headers ?? []);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [responseActions, setResponseActions] = useState<ResponseAction[]>(request?.responseActions ?? []);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  async function handleSave(values: Omit<Request, "id" | "headers">) {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const requestData = { ...values, method, headers, responseActions };
      if (currentRequestId) {
        await updateRequest(collectionId, currentRequestId, requestData);
        showToast({ title: "Request Updated" });
      } else {
        const newReq = await createRequest(collectionId, requestData as NewRequest);
        setCurrentRequestId(newReq.id);
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

  async function handleRun(request: Omit<Request, "id">) {
    // 1. Show a loading toast
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running request..." });
    const requestData: Request = { ...request, headers, responseActions, id: currentRequestId ?? randomUUID() };
    try {
      // 2. Call our utility function
      if (!currentCollection) return;
      const response = await runRequest(requestData, currentCollection);

      // 3. On success, hide the toast and push the response view
      toast.hide();
      if (!response) throw response;
      push(
        <ResponseView
          sourceRequestId={currentRequestId}
          requestSnapshot={requestData}
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
            requestSnapshot={requestData}
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
    }
  }

  return (
    <Form
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
              onAction={() => setHeaders([...headers, { key: "", value: "" }])}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            {activeIndex !== null && (
              <Action
                title="Remove Header"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  if (activeIndex === null) return;
                  setHeaders(headers.filter((_, i) => i !== activeIndex));
                  setActiveIndex(null);
                  showToast({ style: Toast.Style.Success, title: "Header Removed" });
                }}
                shortcut={{ modifiers: ["ctrl"], key: "h" }}
              />
            )}
            <Action
              title="Add Response Action"
              icon={Icon.Plus}
              onAction={() =>
                setResponseActions([
                  ...responseActions,
                  { id: randomUUID(), source: "BODY_JSON", sourcePath: "", variableKey: "" },
                ])
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            {activeActionIndex !== null && (
              <Action
                title="Remove Response Action"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  setResponseActions(responseActions.filter((_, i) => i !== activeActionIndex));
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
        value={method}
        onChange={(newValue) => setMethod(newValue as Method)}
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

      {(["POST", "PUT", "PATCH"] as Array<Method | undefined>).includes(method) && (
        <Form.Dropdown id="bodyType" defaultValue="JSON" title="Body type" info="">
          <Form.Dropdown.Item title="NONE" value="NONE" />
          <Form.Dropdown.Item title="JSON" value="JSON" />
          <Form.Dropdown.Item title="FORM_DATA" value="FORM_DATA" />
        </Form.Dropdown>
      )}
      {/* Conditional fields for Body, Params, etc. */}
      {method && ["POST", "PUT", "PATCH"].includes(method) && (
        <Form.TextArea id="body" title="Body" placeholder="Enter JSON body" defaultValue={request?.body} />
      )}

      {/* Show Params field for GET */}
      {method === "GET" && (
        <Form.TextArea
          id="params"
          title="Params"
          placeholder="Enter params as a JSON object"
          defaultValue={request?.params}
        />
      )}

      {/* Show Query and Variables fields for GraphQL */}
      {method === "GRAPHQL" && (
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

      {headers.length > 0 && (
        <>
          <Form.Separator />
          <KeyValueEditor
            onActiveIndexChange={setActiveIndex}
            title="Headers"
            pairs={headers}
            onPairsChange={setHeaders}
            commonKeys={COMMON_HEADER_KEYS}
          />
        </>
      )}

      <Form.Separator />
      <Form.Description text="Response Actions" />
      <ResponseActionsEditor
        actions={responseActions}
        onActionsChange={setResponseActions}
        onActiveIndexChange={setActiveActionIndex}
      />
    </Form>
  );
}
