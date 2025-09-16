// src/views/ResponseView.tsx
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { METHODS } from "../constants";
import { Method } from "../types";
import { useEffect, useState } from "react";

// The data structure the component will receive
interface ResponseData {
  requestMethod: Method;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}

interface ResponseViewProps {
  response: ResponseData;
}

// A helper to format JSON for Markdown
const mdJson = (json: unknown) => "```json\n" + JSON.stringify(json, null, 2) + "\n```";

type ViewState = "BODY" | "HEADERS";

export function ResponseView({ response }: ResponseViewProps) {
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

  const formattedBody = JSON.stringify(response.body, null, 2);
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
