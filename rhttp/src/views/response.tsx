import { Action, ActionPanel, Color, Detail, Icon, open, showToast, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { MAX_BODY_LENGTH, METHODS } from "~/constants";

import { addHistoryEntry } from "~/store/history";
import { NewRequest, ResponseData } from "~/types";

import { JSONExplorer } from "./json-explorer";
import os from "os";
import { OpenInEditorAction } from "~/components/actions";

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
      <Detail.Metadata.Link title="URL" text={response.requestUrl} target={response.requestUrl} />
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
                await fs.writeFile(filePath, response.body as string);
                await open(filePath);
              }}
            />

            <OpenInEditorAction responseBody={response.body} />
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
  const MAX_JSON_EXPLORER_BODY_SIZE = 1000 * 1024;
  const isBodyTooLarge = bodyString.length > MAX_JSON_EXPLORER_BODY_SIZE;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="JSON Response"
      metadata={metadata}
      actions={
        <ActionPanel>
          {!isBodyTooLarge && (
            <Action.Push
              title="Explore Full Body"
              icon={Icon.CodeBlock}
              target={<JSONExplorer data={response.body} title="Response Body" />}
            />
          )}
          <OpenInEditorAction responseBody={bodyString} />
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
