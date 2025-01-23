import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { Store } from "..";
import { MethodColor } from "../types";
import { mdJson } from "../utils";
import { CookiesList } from "./cookies";
import { AxiosResponse } from "axios";

function ResponseView({ store, response }: { store: Store; response: AxiosResponse }) {
  const { cookies } = store;

  function getStatusColor(status: string) {
    if (status.startsWith("1")) return Color.Blue;
    if (status.startsWith("2")) return Color.Green;
    if (status.startsWith("3")) return Color.Orange;
    if (status.startsWith("4")) return Color.Red;
    if (status.startsWith("5")) return Color.Red;
    return Color.PrimaryText;
  }

  const request = response?.config!;

  function getMethodColor() {
    const m = request.method?.toUpperCase() as keyof MethodColor;
    const availableMethods = Object.keys(MethodColor);
    if (!availableMethods.some((x) => x === m)) return Color.PrimaryText;

    // @ts-ignore
    return MethodColor[m as keyof MethodColor];
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard icon={Icon.Clipboard} content={JSON.stringify(response.data)} title="Copy response" />
          <ActionPanel.Submenu title="Cookies">
            <Action.Push title="View cookies" target={<CookiesList store={store} />} />
            <Action
              style={Action.Style.Destructive}
              title="Clear cookies"
              onAction={() => {
                cookies.setValue({});
              }}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
      navigationTitle={request.url}
      markdown={`## Response  \n${mdJson(response.data)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Method">
            <Detail.Metadata.TagList.Item text={request.method?.toUpperCase()} color={getMethodColor()} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={`${response?.status}`} color={getStatusColor(`${response?.status}`)} />
            <Detail.Metadata.TagList.Item
              text={`${response?.statusText}`}
              color={getStatusColor(`${response?.status}`)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {Object.entries(response?.headers || {}).map(([header, value]) => (
            <Detail.Metadata.TagList key={header} title={header}>
              <Detail.Metadata.TagList.Item text={value?.toString()} />
            </Detail.Metadata.TagList>
          ))}
        </Detail.Metadata>
      }
    />
  );
}

export { ResponseView as AxiosResponseView };
