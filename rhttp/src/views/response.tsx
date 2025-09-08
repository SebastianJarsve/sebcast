// src/views/ResponseView.tsx
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { METHODS } from "../constants";
import { Method } from "../types";

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

export function ResponseView({ response }: ResponseViewProps) {
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

  return (
    <Detail
      markdown={`## Body\n${mdJson(response.body)}`}
      navigationTitle="Response"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard icon={Icon.Clipboard} content={formattedBody} title="Copy Response Body" />
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
