import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { Fragment, useState } from "react";
import { Store } from "..";
import { Collection, headerKeys, PartialBy } from "../types";
import { CookiesList } from "./cookies";

function CollectionForm({
  collection,
  onSubmit,
  store,
}: {
  collection: PartialBy<Collection, "id">;
  onSubmit: (collection: PartialBy<Collection, "id">) => void;
  store: Store;
}) {
  const [activeHeader, setActiveHeader] = useState<string | undefined>();
  const [headerSearchTexts, setHeaderSearchTexts] = useState<Array<string | undefined>>([]);
  const [headers, setHeaders] = useState<Collection["headers"]>(collection.headers ?? []);

  async function saveCollection(c: PartialBy<Collection, "id">) {
    onSubmit({ ...collection, ...c, headers });
    showToast({ title: "Collection saved" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.SaveDocument}
            onSubmit={saveCollection}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />

          <Action
            title="Add header"
            icon={Icon.Heading}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => {
              // setHeaders({ ...headers, [""]: "" });
              setHeaders([...headers, { key: "", value: "" }]);
            }}
          />
          <Action
            title="Remove active header"
            icon={Icon.Heading}
            shortcut={{ modifiers: ["ctrl"], key: "h" }}
            onAction={() => {
              setHeaders(headers.filter((h) => h.key !== activeHeader));
            }}
          />
          <ActionPanel.Submenu title="Cookies">
            <Action.Push title="View cookies" target={<CookiesList store={store} />} />
            <Action
              style={Action.Style.Destructive}
              title="Clear cookies"
              onAction={() => {
                store.cookies.setValue({});
              }}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter title" defaultValue={collection.title} />
      <Form.TextField id="baseUrl" title="Base URL" placeholder="Enter base URL" defaultValue={collection.baseUrl} />
      <Form.Separator />

      <Form.Description title="Headers" text="⌘H Add" />
      {headers.length &&
        headers.map(({ key, value }, index) => {
          return (
            <Fragment key={`header-${index}`}>
              {/* {activeHeader === key && <Form.Description text="Active 👇" />} */}
              <Form.Dropdown
                id={`header-key-${index}`}
                title="Key"
                onChange={(k) => {
                  const newHeaders = [...headers];
                  newHeaders[index].key = k;
                  setHeaders(newHeaders);
                }}
                value={key ?? ""}
                onFocus={() => setActiveHeader(key)}
                onSearchTextChange={(text) => {
                  const newHeaderSearchTexts = [...headerSearchTexts];
                  const payload = text.trim();
                  newHeaderSearchTexts[index] = payload === "" ? undefined : payload;
                  setHeaderSearchTexts(newHeaderSearchTexts);
                }}
              >
                {headerSearchTexts[index] !== undefined && (
                  <Form.Dropdown.Item
                    key={`header-${-1}-key`}
                    value={headerSearchTexts[index]!}
                    title={headerSearchTexts[index]!}
                  />
                )}
                {headerKeys
                  .filter((option) => {
                    const search = headerSearchTexts[index];
                    return search === undefined || option.toLowerCase().includes(search.toLowerCase());
                  })
                  .map((key, idx) => (
                    <Form.Dropdown.Item key={`header-${idx}-key`} value={key} title={key} />
                  ))}
              </Form.Dropdown>
              <Form.TextField
                id={`header-value-${index}`}
                title="Value"
                placeholder="Header value"
                value={value}
                onFocus={() => setActiveHeader(key)}
                onChange={(value) => {
                  setHeaders(
                    headers.map((h) => {
                      if (h.key === key) h.value = value;
                      return h;
                    }),
                  );
                }}
              />
            </Fragment>
          );
        })}
    </Form>
  );
}

export { CollectionForm };
