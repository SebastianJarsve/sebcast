import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { useEffect, useMemo, useState } from "react";
import { Store } from "..";
import { Collection, MethodColor, Methods, PartialBy } from "../types";
import { CollectionForm } from "./collection-form";
import { CookiesList } from "./cookies";
import { RequestForm } from "./request-form";
import { buildHeadersObject, runRequest } from "../utils";
import { AxiosResponseView } from "./response";

function AllRequests({ store }: { store: Store }) {
  const { collections, cookies, currentCollectionId } = store;
  const navigation = useNavigation();
  const isLoading = collections.isLoading || cookies.isLoading || currentCollectionId.isLoading;

  const [isLoadingScreen, setIsLoadingScreen] = useState(true);
  useEffect(() => {
    setTimeout(() => setIsLoadingScreen(false), 50);
  }, []);
  const collection = collections.value?.find((c) => c.id === currentCollectionId.value);

  function onSubmitCollectionForm(newCollection: PartialBy<Collection, "id">) {
    if (collections === undefined) return;
    if (newCollection.id === undefined) {
      const newId = randomUUID();
      collections.setValue([...(collections?.value ?? []), { ...newCollection, id: newId }]);
      currentCollectionId.setValue(newId);
      navigation.pop();
    } else {
      const newCollections = collections.value?.map((c) => {
        if (c.id === newCollection.id && newCollection.id !== undefined) return { ...c, ...newCollection };
        return c;
      });
      if (!newCollections) return;
      collections.setValue(newCollections);
    }
  }

  const collectionHeaders = useMemo(() => buildHeadersObject(collection?.headers ?? []), [collection]);

  function DefaultActions() {
    return (
      <>
        <Action.Push
          title="New request"
          icon={Icon.NewDocument}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<RequestForm store={store} req={{ method: Methods.GET, url: "/", headers: [] }} />}
        />
        <Action.Push
          title="New collection"
          icon={Icon.NewFolder}
          shortcut={{ key: "n", modifiers: ["shift", "cmd"] }}
          target={
            <CollectionForm
              store={store}
              onSubmit={onSubmitCollectionForm}
              collection={{ baseUrl: "", requests: [], title: "", headers: [] }}
            />
          }
        />
        <Action.Push
          title="Edit collection"
          icon={Icon.Pencil}
          shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
          target={
            <CollectionForm
              store={store}
              onSubmit={onSubmitCollectionForm}
              collection={collections.value?.find((c) => c.id === currentCollectionId.value)!}
            />
          }
        />
        <ActionPanel.Submenu icon={"🍪"} title="Cookies">
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
        <Action
          title="Export collection"
          icon={Icon.Download}
          onAction={() => {
            Clipboard.copy(JSON.stringify(collection));
            showHUD("Exported collection to clipboard");
          }}
        />
        <Action
          title="Import collection"
          icon={Icon.Upload}
          onAction={async () => {
            const data = await Clipboard.readText();
            if (data) {
              try {
                const newCollection = JSON.parse(data) as unknown as Collection;
                if (newCollection.id === undefined || newCollection.id === "") {
                  newCollection.id = randomUUID();
                }
                if (collections.value?.some((c) => c.id === newCollection.id)) {
                  if (
                    await confirmAlert({
                      title: "Already exist",
                      message: "This collection already exists. Do you want to overwrite it?",
                      icon: Icon.Warning,
                    })
                  ) {
                    collections.setValue(
                      collections.value.map((c) => {
                        if (c.id === newCollection.id) return newCollection;
                        return c;
                      }),
                    );
                  }
                  return;
                }
                if (collections.value) collections.setValue([...collections.value, newCollection]);
              } catch (e) {
                console.error(e);
                showToast({ message: JSON.stringify(e), title: "Error" });
              }
            }
          }}
        />
        <Action
          title="Delete collection"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={async () => {
            if (!collections.value) return;
            if (
              await confirmAlert({
                title: "Are you sure you want to delete this collection?",
                message: "All of the requests will also be deleted.",
                icon: Icon.DeleteDocument,
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              })
            )
              collections.setValue(collections.value?.filter((c) => c.id !== currentCollectionId.value));
          }}
        />
      </>
    );
  }

  if (isLoading || isLoadingScreen) return <Detail isLoading markdown={""}></Detail>;

  return (
    <List
      navigationTitle={collection?.title}
      actions={
        <ActionPanel>
          <DefaultActions />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Select collection" onChange={currentCollectionId.setValue} value={collection?.id}>
          {collections.value?.map((c) => <List.Dropdown.Item title={c.title} value={c.id} key={c.id} />)}
        </List.Dropdown>
      }
    >
      {collection?.requests
        .sort((a, b) => {
          return a.method.localeCompare(b.method) || a.title?.localeCompare(b.title || "") || 0;
        })
        .map((req) => {
          return (
            <List.Item
              key={req.id}
              accessories={[{ tag: { value: req.method, color: MethodColor[req.method] } }]}
              title={req.title || req.url}
              subtitle={req.title !== undefined ? req.url : undefined}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Select"
                    icon={Icon.Pencil}
                    target={<RequestForm store={store} req={req} collectionHeaders={collectionHeaders} />}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />

                  <Action
                    title="Run request"
                    icon={Icon.Bolt}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={async () => {
                      const resp = await runRequest(req, store);
                      navigation.push(<AxiosResponseView response={resp!} store={store} />);
                    }}
                  />

                  <Action
                    title="Duplicate request"
                    icon={Icon.Duplicate}
                    shortcut={Keyboard.Shortcut.Common.Duplicate}
                    onAction={() => {
                      const dup = { ...req, id: randomUUID() };
                      store.collections.setValue(
                        collections.value!.map((c) => {
                          if (c.id === collection.id) {
                            collection.requests = [...collection.requests, dup];
                          }
                          return c;
                        }),
                      );
                    }}
                  />

                  <DefaultActions />

                  <Action
                    title="Delete request"
                    icon={Icon.DeleteDocument}
                    shortcut={{ key: "x", modifiers: ["ctrl"] }}
                    onAction={async () => {
                      if (
                        !(await confirmAlert({
                          title: "Are you sure you want to delete this request?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        }))
                      )
                        return;
                      const newCollections = collections.value?.map((c) => {
                        if (c.id === currentCollectionId.value) {
                          return {
                            ...c,
                            requests: c.requests.filter((r) => r.id !== req.id),
                          };
                        }
                        return c;
                      });
                      if (newCollections) collections.setValue(newCollections);
                    }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

export { AllRequests };
