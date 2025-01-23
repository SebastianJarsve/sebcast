import { Action, ActionPanel, Form, Icon, Keyboard, showToast, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";
import { Fragment, useMemo, useState } from "react";
import { Store } from "..";
import { headerKeys, HeadersObject, MethodColor, Methods, NewRequest, PartialBy, Request } from "../types";
import { CookiesList } from "./cookies";
import { runRequest } from "../utils";
import { AxiosResponseView } from "./response";

function RequestForm({
  store,
  req,
}: {
  store: Store;
  req: PartialBy<Request, "id">;
  collectionHeaders?: HeadersObject;
}) {
  const { cookies, currentCollectionId, collections } = store;
  const collection = useMemo(() => {
    return collections.value?.find((c) => c.id === currentCollectionId.value);
  }, [currentCollectionId]);
  const { push } = useNavigation();
  const [method, setMethod] = useState<Request["method"]>(req.method);
  const [headerSearchTexts, setHeaderSearchTexts] = useState<Array<string | undefined>>([]);
  const [headers, setHeaders] = useState<Request["headers"]>(req.headers || []);

  const [activeHeader, setActiveHeader] = useState<string | undefined>();

  function updateRequest(r: Request) {
    if (!collections) return;
    const newCollections = collections.value?.map((c) => {
      if (c.id === currentCollectionId.value) {
        return {
          ...c,
          requests: c.requests.map((old) => {
            if (old.id === r.id) return { ...r, headers };
            return old;
          }),
        };
      }
      return c;
    });
    if (newCollections) collections.setValue(newCollections);
  }

  async function saveRequest(r: NewRequest) {
    showToast({ title: "Saved request" });
    if (req.id !== undefined) {
      // Update request
      updateRequest({ ...r, id: req.id! });
    } else {
      // Create new request
      if (!collections) return;
      const newCollections = collections.value?.map((c) => {
        if (c.id === currentCollectionId.value) {
          return { ...c, requests: [...c.requests, { ...r, headers, id: randomUUID() }] };
        }
        return c;
      });
      if (newCollections) collections.setValue(newCollections);
    }
  }

  return (
    <Form
      navigationTitle={collection?.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Bolt}
            title="Run request"
            shortcut={Keyboard.Shortcut.Common.Open}
            onSubmit={async (data: Request) => {
              const resp = await runRequest({ ...data, headers }, store);
              if (resp) push(<AxiosResponseView response={resp!} store={store} />);
            }}
          />
          <Action.SubmitForm
            title="Save"
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={saveRequest}
          />
          <Action
            title="Add header"
            icon={Icon.Heading}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => {
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
          <ActionPanel.Submenu title="Cookies" icon={"🍪"}>
            <Action.Push title="View cookies" icon={Icon.Eye} target={<CookiesList store={store} />} />
            <Action
              title="Clear cookies"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={() => {
                cookies.setValue({});
              }}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      {collection?.baseUrl && <Form.Description text={`Base url: ${collection?.baseUrl}`} />}

      <Form.Dropdown
        defaultValue={req.method}
        onChange={(m) => setMethod(m as Request["method"])}
        id="method"
        title="HTTP Method"
      >
        <Form.Dropdown.Item
          value={Methods.GET}
          title={Methods.GET}
          icon={{ source: Icon.Circle, tintColor: MethodColor.GET }}
        />
        <Form.Dropdown.Item
          value={Methods.POST}
          title={Methods.POST}
          icon={{ source: Icon.Circle, tintColor: MethodColor.POST }}
        />
        <Form.Dropdown.Item
          value={Methods.PUT}
          title={Methods.PUT}
          icon={{ source: Icon.Circle, tintColor: MethodColor.PUT }}
        />
        <Form.Dropdown.Item
          value={Methods.PATCH}
          title={Methods.PATCH}
          icon={{ source: Icon.Circle, tintColor: MethodColor.PATCH }}
        />
        <Form.Dropdown.Item
          value={Methods.DELETE}
          title={Methods.DELETE}
          icon={{ source: Icon.Circle, tintColor: MethodColor.DELETE }}
        />
        <Form.Dropdown.Item
          value={Methods.GRAPHQL}
          title={Methods.GRAPHQL}
          icon={{ source: Icon.Circle, tintColor: MethodColor.GRAPHQL }}
        />
      </Form.Dropdown>

      <Form.TextField id="title" title="Title" placeholder="Enter title" defaultValue={req.title} />
      <Form.TextField id="url" title="URL" placeholder="Enter url" defaultValue={req.url} />
      {[Methods.PATCH, Methods.POST, Methods.PUT].includes(method) && (
        <Form.TextArea id="body" title="Body" placeholder="Enter json body" defaultValue={req.body} />
      )}
      {[Methods.GET].includes(method) && (
        <Form.TextArea id="params" title="Params" placeholder="Enter get params as json" defaultValue={req.params} />
      )}
      {[Methods.GRAPHQL].includes(method) && (
        <>
          <Form.TextArea id="query" title="Query" placeholder="Enter query" defaultValue={req.query} />
          <Form.TextArea
            id="variables"
            title="Variables"
            placeholder="Enter get variables as json"
            defaultValue={req.variables || ""}
          />
        </>
      )}
      <Form.Separator />

      <Form.Description title="Headers" text="⌘H Add" />
      {headers.length &&
        headers.map(({ key, value }, index) => {
          return (
            <Fragment key={`header-${index}`}>
              {activeHeader === key && <Form.Description text="Active 👇" />}
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

export { RequestForm };
