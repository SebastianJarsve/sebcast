import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { NewRequest, Request, Method } from "~/types";
import { $collections, $currentCollectionId, createRequest, updateRequest } from "~/store";
import { COMMON_HEADER_KEYS, METHODS } from "~/constants";
import { z } from "zod";
import { ErrorDetail } from "./error-view";
import { randomUUID } from "crypto";
import { ResponseActionsEditor } from "~/components/response-actions-editor";
import { KeyValueEditor } from "~/components/key-value-editor";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { CopyVariableAction, GlobalActions } from "~/components/actions";
import { $currentEnvironmentId, $environments } from "~/store/environments";
import { useRunRequest } from "~/hooks/use-run-request";

interface RequestFormProps {
  collectionId: string;
  request: Partial<Request>;
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
          <Action title="Run Request" icon={Icon.Bolt} onAction={handleRun} />
          <Action
            title="Save Request"
            icon={Icon.HardDrive}
            onAction={handleSave}
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
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g., Get All Users"
        value={dirtyRequest.title}
        onChange={(title) => setDirtyRequest((old) => ({ ...old, title }))}
      />
      <Form.TextField
        id="url"
        title="URL / Path"
        placeholder="/users or https://api.example.com"
        value={dirtyRequest.url}
        onChange={(url) => setDirtyRequest((old) => ({ ...old, url }))}
      />

      {(["POST", "PUT", "PATCH"] as Array<Method | undefined>).includes(dirtyRequest.method) && (
        <Form.Dropdown
          id="bodyType"
          title="Body type"
          info=""
          value={dirtyRequest.bodyType}
          onChange={(bodyType) => setDirtyRequest((old) => ({ ...old, bodyType: bodyType as Request["bodyType"] }))}
        >
          <Form.Dropdown.Item title="NONE" value="NONE" />
          <Form.Dropdown.Item title="JSON" value="JSON" />
          <Form.Dropdown.Item title="FORM_DATA" value="FORM_DATA" />
        </Form.Dropdown>
      )}
      {/* Conditional fields for Body, Params, etc. */}
      {dirtyRequest.method && ["POST", "PUT", "PATCH"].includes(dirtyRequest.method) && (
        <Form.TextArea
          id="body"
          title="Body"
          placeholder="Enter JSON body"
          value={dirtyRequest.body}
          onChange={(body) => setDirtyRequest((old) => ({ ...old, body }))}
        />
      )}

      {/* Show Params field for GET */}
      {dirtyRequest.method === "GET" && (
        <Form.TextArea
          id="params"
          title="Params"
          placeholder="Enter params as a JSON object"
          value={dirtyRequest.params}
          onChange={(params) => setDirtyRequest((old) => ({ ...old, params }))}
        />
      )}

      {/* Show Query and Variables fields for GraphQL */}
      {dirtyRequest.method === "GRAPHQL" && (
        <>
          <Form.TextArea
            id="query"
            title="Query"
            placeholder="Enter GraphQL query"
            value={dirtyRequest.query}
            onChange={(query) => setDirtyRequest((old) => ({ ...old, query }))}
          />
          <Form.TextArea
            id="variables"
            title="Variables"
            placeholder="Enter variables as a JSON object"
            value={dirtyRequest.variables}
            onChange={(variables) => setDirtyRequest((old) => ({ ...old, variables }))}
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
