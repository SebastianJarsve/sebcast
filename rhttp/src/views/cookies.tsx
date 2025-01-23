import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { Store } from "..";
import { ParsedCookie } from "../types";

function CookiesList({ store: { cookies } }: { store: Store }) {
  const flatCookies = Object.entries(cookies.value ?? {}).reduce(
    (acc, [path, cookie]) => {
      cookie.forEach((c) => acc.push({ path, cookie: c }));
      return acc;
    },
    [] as { path: string; cookie: ParsedCookie }[],
  );
  return (
    <List isLoading={cookies.isLoading} navigationTitle="Cookies" isShowingDetail>
      {flatCookies.map(({ cookie, path }) => (
        <List.Item
          key={cookie.cookieName + path}
          title={cookie.cookieName}
          subtitle={cookie.cookieValue}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title={"Path"}>
                    <List.Item.Detail.Metadata.TagList.Item text={path} />
                  </List.Item.Detail.Metadata.TagList>
                  {Object.entries(cookie.options).map(([key, value]) => (
                    <List.Item.Detail.Metadata.TagList key={key} title={key}>
                      <List.Item.Detail.Metadata.TagList.Item text={JSON.stringify(value)} />
                    </List.Item.Detail.Metadata.TagList>
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy cookie value" content={cookie.cookieValue} />
              <Action.CopyToClipboard title="Copy cookie name" content={cookie.cookieName} />
              <Action
                title="Delete"
                shortcut={Keyboard.Shortcut.Common.Remove}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  const cookiesForPath = cookies.value?.[path] ?? [];
                  cookies.setValue({
                    ...cookies.value,
                    [path]: cookiesForPath.filter((c) => c.cookieName !== cookie.cookieName),
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export { CookiesList };
