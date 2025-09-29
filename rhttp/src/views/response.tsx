import { Action, ActionPanel, Color, Detail, environment, Icon, open, showToast, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { MAX_BODY_LENGTH, METHODS } from "~/constants";

import { addHistoryEntry } from "~/store/history";
import { NewRequest, ResponseData } from "~/types";

import { JSONExplorer } from "./json-explorer";
import os from "os";
import { JSONStreamViewer } from "./streamed-array";

export interface ResponseViewProps {
  requestSnapshot: NewRequest;
  sourceRequestId?: string;
  response: ResponseData;
}

export function ResponseView({ requestSnapshot, sourceRequestId, response }: ResponseViewProps) {
  const { push } = useNavigation();
  function getStatusColor(status: number) {
    if (status >= 500) return Color.Red;
    if (status >= 400) return Color.Red;
    if (status >= 300) return Color.Orange;
    if (status >= 200) return Color.Green;
    return Color.PrimaryText;
  }

  function getMethodColor() {
    return METHODS[response.requestMethod]?.color ?? Color.PrimaryText;
  }

  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  const isHtml = contentType.includes("text/html");

  // Create the metadata component once, as it's used in both views.
  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Method">
        <Detail.Metadata.TagList.Item text={response.requestMethod} color={getMethodColor()} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={`${response.status}`} color={getStatusColor(response.status)} />
        <Detail.Metadata.TagList.Item text={response.statusText} color={getStatusColor(response.status)} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      {Object.entries(response.headers).map(([key, value]) => (
        <Detail.Metadata.Label key={key} title={key} text={value} />
      ))}
    </Detail.Metadata>
  );

  // --- Render for HTML ---
  if (isHtml && typeof response.body === "string") {
    const isBodyLarge = response.body.length > MAX_BODY_LENGTH;
    const bodyPreview = isBodyLarge
      ? response.body.slice(0, MAX_BODY_LENGTH) + "\n\n... (HTML body truncated)"
      : response.body;
    const markdown = `## HTML Preview\n\`\`\`html\n${bodyPreview}\n\`\`\``;

    return (
      <Detail
        markdown={markdown}
        navigationTitle="HTML Response"
        metadata={metadata}
        actions={
          <ActionPanel>
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              onAction={async () => {
                const filePath = path.join(os.tmpdir(), `raycast-response-${randomUUID()}.html`);
                await fs.writeFile(response.body as string, filePath);
                await open(filePath);
              }}
            />
            <Action.CopyToClipboard title="Copy HTML Body" content={response.body} />
            <Action
              title="Save to History"
              icon={Icon.Clock}
              onAction={async () => {
                await addHistoryEntry(requestSnapshot, response, sourceRequestId);
                showToast({ title: "Saved to History" });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // --- Render for JSON (and other types) ---
  const bodyString = JSON.stringify(response.body, null, 2);
  const isBodyLarge = bodyString.length > MAX_BODY_LENGTH;
  const bodyPreview = isBodyLarge ? bodyString.slice(0, MAX_BODY_LENGTH) + "\n\n... (Body truncated)" : bodyString;
  const markdown = `## JSON Body\n\`\`\`json\n${bodyPreview}\n\`\`\``;
  const MAX_BODY_SIZE = 1000 * 1024; // 500 KB limit for the explorer
  const isBodyTooLarge = bodyString.length > MAX_BODY_SIZE;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="JSON Response"
      metadata={metadata}
      actions={
        <ActionPanel>
          {!isBodyTooLarge && (
            <Action
              title="Explore Full Body"
              icon={Icon.CodeBlock}
              // target={<JSONExplorer data={response.body} title="Response Body" />}

              onAction={async () => {
                const body = response.body;
                const newTitle = `Response: ${requestSnapshot.title ?? requestSnapshot.url}`;

                if (Array.isArray(body) && body.length > 100) {
                  // If it's a large array, save to temp file and use the streamer
                  const tempPath = path.join(environment.supportPath, `stream-response.json`);
                  await fs.writeFile(tempPath, JSON.stringify(body));
                  push(<JSONStreamViewer jsonFilePath={tempPath} title={newTitle} />);
                } else if (typeof body === "object" && body !== null) {
                  // If it's an object or small array, use the in-memory explorer
                  push(<JSONExplorer data={body} title={newTitle} />);
                }
              }}
            />
          )}
          <Action
            title="Open body Editor"
            icon={Icon.Code}
            onAction={async () => {
              const tempPath = path.join(environment.supportPath, `response-${randomUUID()}.json`);
              await fs.writeFile(tempPath, bodyString);
              const editor = process.env.EDITOR;
              console.log(editor);
              if (editor) {
                // If $EDITOR is set, use a deep link to open the file in a new terminal tab.
                // This will use the user's default terminal app configured in Raycast's settings.
                await open(`raycast://extensions/raycast/terminal/new-terminal-tab?command=${editor} ${tempPath}`);
              }
              open(tempPath); // Opens the file in the default .json editor (e.g., VS Code)
            }}
          />

          <Action.CopyToClipboard title="Copy Full Body" content={bodyString} />
          <Action
            title="Save to History"
            icon={Icon.Clock}
            onAction={async () => {
              await addHistoryEntry(requestSnapshot, response, sourceRequestId);
              showToast({ title: "Saved to History" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
