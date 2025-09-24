// src/views/ResponseView.tsx
import { Action, ActionPanel, Color, Detail, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { METHODS } from "~/constants";
import { NewRequest, Request, ResponseData } from "~/types";
import { useEffect, useState } from "react";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import { addHistoryEntry } from "~/store/history";
import { z } from "zod";
import { ErrorDetail } from "./error-view";

export interface ResponseViewProps {
  request: NewRequest | Request;
  sourceRequestId?: string;
  response: ResponseData;
}

// A helper to format JSON for Markdown
export const mdJson = (json: unknown) => "```json\n" + JSON.stringify(json, null, 2) + "\n```";

type ViewState = "BODY" | "HEADERS";

export function ResponseView({ response, request, sourceRequestId }: ResponseViewProps) {
  const { push } = useNavigation();
  const [markdown, setMarkdown] = useState("");
  const [viewState, setViewState] = useState<ViewState>("BODY");
  // Helper to color-code the status
  function getStatusColor(status: number) {
    if (status >= 500) return Color.Red;
    if (status >= 400) return Color.Red;
    if (status >= 300) return Color.Orange;
    if (status >= 200) return Color.Green;
    if (status >= 100) return Color.Blue;
    return Color.PrimaryText;
  }

  // Helper to get the method color from our constants
  function getMethodColor() {
    return METHODS[response.requestMethod]?.color ?? Color.PrimaryText;
  }

  const contentType = response.headers["content-type"] || "";
  const isHtml = contentType.includes("text/html");

  const formattedBody = isHtml ? (response.body as string) : JSON.stringify(response.body, null, 2);
  const headers = JSON.stringify(response.headers, null, 2);

  useEffect(() => {
    setMarkdown(`## Body\n${mdJson(response.body)}`);
  }, [response]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Response"
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Heading}
            title={`Show ${viewState === "BODY" ? "body" : "headers"}`}
            onAction={() => {
              const md = viewState === "BODY" ? mdJson(response.headers) : mdJson(response.body);
              setViewState((old) => {
                const newState = old === "BODY" ? "HEADERS" : "BODY";
                setMarkdown(`## ${newState === "BODY" ? "Body" : "Headers"}\n${md}`);
                return newState;
              });
            }}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            content={formattedBody}
            title="Copy Response Body"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            icon={Icon.CopyClipboard}
            content={headers}
            title={"Copy Response Headers"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Save to History"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              try {
                await addHistoryEntry(request, response, sourceRequestId);
                showToast({ title: "Saved to History" });
              } catch (error) {
                // If validation fails, show the detailed error view
                if (error instanceof z.ZodError) {
                  push(<ErrorDetail error={error} />);
                } else {
                  showToast({ style: Toast.Style.Failure, title: "Failed to Save History" });
                }
              }
            }}
          />
          {isHtml && typeof response.body === "string" && (
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              onAction={async () => {
                // Create a unique file name in the system's temporary directory
                const filePath = path.join(require("os").tmpdir(), `raycast-response-${randomUUID()}.html`);
                // Write the HTML content to the file
                await fs.writeFile(filePath, response.body as string);
                // Open the local file in the default browser
                await open(filePath);
              }}
            />
          )}
          {/* We can add cookie actions back here later */}
        </ActionPanel>
      }
      metadata={
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
      }
    />
  );
}
