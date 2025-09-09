// RequestForm.tsx
import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { NewRequest, Request, Headers, Method } from "../types";
import { $collections, $currentCollection, createRequest, updateRequest, useAtom } from "../store";
import { METHODS } from "../constants"; // Assuming you have a constants file for METHODS etc.
import { HeadersEditor } from "../headers-editor";
import { z } from "zod";
import { ErrorDetail } from "./error-view";
import { runRequest } from "../utils";
import { ResponseView } from "./response";
import axios from "axios";
import { $secrets } from "../secrets";

interface RequestFormProps {
  collectionId: string;
  requestId?: string;
}

export function RequestForm({ collectionId, requestId }: RequestFormProps) {
  const { pop, push } = useNavigation();
  const { value: collections } = useAtom($collections);
  const { value: currentCollection } = useAtom($currentCollection);
  const { value: secrets } = useAtom($secrets);
  const secretKeys = secrets.map((s) => s.key);

  // Find the parent collection and the specific request to edit (if any)
  const [request] = useState<Request | NewRequest | undefined>(() => {
    if (requestId) {
      const collection = collections.find((c) => c.id === collectionId);
      return collection?.requests.find((r) => r.id === requestId);
    }
    return { method: "GET", url: "", headers: [] }; // Blank slate for a new request
  });

  // Local state for form fields, initialized from the request data
  const [method, setMethod] = useState(request?.method);
  const [headers, setHeaders] = useState<Headers>(request?.headers ?? []);
  // State to track the currently focused header index ---
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Used to focus the field when a header field is removed.
  const titleFieldRef = useRef<Form.TextField>(null);
  // Create a ref to hold an array of refs for each header field
  const headerFieldRefs = useRef<(Form.Dropdown | null)[]>([]);

  useEffect(() => {
    // This effect runs only when the number of headers changes
    headerFieldRefs.current = headerFieldRefs.current.slice(0, headers.length);
  }, [headers]);

  async function handleSave(values: Omit<Request, "id" | "headers">) {
    try {
      const requestData = { ...values, headers };

      if (requestId) {
        await updateRequest(collectionId, requestId, requestData);
        showToast({ title: "Request Updated" });
      } else {
        await createRequest(collectionId, requestData as NewRequest);
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
    }
  }

  async function handleRun(request: Omit<Request, "id" | "headers">) {
    console.log(request);
    // 1. Show a loading toast
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running request..." });
    try {
      // 2. Call our utility function
      if (!currentCollection) return;
      const response = await runRequest({ ...request, headers } as Omit<Request, "id">, currentCollection);
      console.log(response);

      // 3. On success, hide the toast and push the response view
      toast.hide();
      if (!response) throw response;
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
      console.warn("HAS ERROR", error);
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
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Request" icon={Icon.Bolt} onSubmit={handleRun} />
          <Action.SubmitForm
            title="Save Request"
            icon={Icon.HardDrive}
            onSubmit={handleSave}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />

          <ActionPanel.Submenu title="Insert Secret" icon={Icon.Key} shortcut={{ modifiers: ["cmd"], key: "i" }}>
            {secretKeys.length > 0 ? (
              secretKeys.map((key) => (
                <Action
                  key={key}
                  title={key}
                  onAction={async () => {
                    const content = `{{${key}}}`;
                    await Clipboard.copy(content);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied to Clipboard",
                      message: content,
                    });
                  }}
                />
              ))
            ) : (
              <Action
                title="No Secrets Defined"
                onAction={() => {
                  /* maybe push to a "manage secrets" form */
                }}
              />
            )}
          </ActionPanel.Submenu>

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

                const newFocusIndex = activeIndex > 0 ? activeIndex - 1 : 0;

                const newHeaders = headers.filter((_, i) => i !== activeIndex);
                setHeaders(headers.filter((_, i) => i !== activeIndex));
                setActiveIndex(null);
                showToast({ style: Toast.Style.Success, title: "Header Removed" });

                // Defer the focus call until after React has re-rendered
                setTimeout(() => {
                  if (newHeaders.length === 0) {
                    // If no headers remain, focus the title field.
                    titleFieldRef.current?.focus();
                  } else {
                    // If headers remain, focus the new last one.
                    headerFieldRefs.current[newFocusIndex]?.focus();
                  }
                }, 0); // A 0ms delay is enough to push this to the end of the event queue
              }}
              shortcut={{ modifiers: ["ctrl"], key: "h" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title={`Collection: ${currentCollection?.title}`}
        text={currentCollection?.baseUrl || "No base URL"}
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
      <Form.TextField
        id="title"
        title="Title"
        ref={titleFieldRef}
        placeholder="e.g., Get All Users"
        defaultValue={request?.title}
      />
      <Form.TextField
        id="url"
        title="URL / Path"
        placeholder="/users or https://api.example.com"
        defaultValue={request?.url}
      />

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

      <Form.Separator />
      <Form.Description text="Headers" />
      {/* We'll use our robust header management component here */}
      <HeadersEditor
        headers={headers}
        onHeadersChange={setHeaders}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        headerFieldRefs={headerFieldRefs}
      />
    </Form>
  );
}
