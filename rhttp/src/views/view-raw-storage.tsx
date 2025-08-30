// import { Detail } from "@raycast/api";

// import { Store } from "..";

// function RawStorageView({ store }: { store: Store }) {
//   const data = JSON.stringify(store.collections.value, null, 2);
//   return <Detail markdown={`${data}`} />;
// }

// export { RawStorageView };

import { List, ActionPanel, Action, environment } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "fs/promises";
import { join } from "path";

// Tune these to your data size:
const PAGE_SIZE = 200; // how many children per page
const PREVIEW_LIMIT = 4000; // chars to render in right-pane preview

type Path = (string | number)[];

function BackActions({ canGoUp, onBack }: { canGoUp: boolean; onBack: () => void }) {
  if (!canGoUp) return null;
  return (
    <>
      <Action title="Up One Level" onAction={onBack} shortcut={{ key: "backspace", modifiers: [] }} />
      <Action title="Up One Level" onAction={onBack} shortcut={{ key: "escape", modifiers: [] }} />
      <Action title="Up One Level" onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
    </>
  );
}

export function RawStorageView({ store }: { store: { collections: { value: unknown } } }) {
  const root = useMemo(() => store.collections.value, [store.collections.value]);

  const [path, setPath] = useState<Path>([]);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [highlight, setHighlight] = useState(true); // toggle syntax highlighting if needed

  // Resolve current node
  const node = useMemo(() => getNode(root, path), [root, path]);

  // Build a *paged* list of child keys WITHOUT touching their values yet
  const { rows, total } = useMemo(() => listChildrenPaged(node, page, PAGE_SIZE), [node, page]);

  // Compute preview lazily for the selected row only
  const [preview, setPreview] = useState<string>("");
  useEffect(() => {
    const row = rows.find((r) => r.id === selectedId) ?? rows[0];
    if (!row) {
      setPreview("");
      return;
    }
    const value = getNode(node, [row.accessor]); // one step down from current node
    // Only stringify the selected sub-tree
    const s = safeStringify(value);
    setPreview(s.length > PREVIEW_LIMIT ? s.slice(0, PREVIEW_LIMIT) + "\n… (truncated)" : s);
  }, [rows, selectedId, node]);

  // Reset paging/selection when path changes
  useEffect(() => {
    setPage(0);
    setSelectedId(undefined);
  }, [path.join("/")]);

  const fence = highlight ? "```json" : "```text";
  const breadcrumb = "/" + (path.length ? path.map(String).join("/") : "");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={`Browsing ${breadcrumb || "/"} — page ${page + 1}/${pages}`}
      onSelectionChange={(id) => setSelectedId(id)}
      selectedItemId={selectedId}
      throttle
    >
      {/* Up one level */}
      {path.length > 0 && (
        <List.Item
          key=".."
          id=".."
          title=".."
          subtitle="Back"
          actions={
            <ActionPanel>
              <Action
                title="Back"
                onAction={() => setPath((p) => p.slice(0, -1))}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
              />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown="Go up one level" />}
        />
      )}

      {/* Children for this page */}
      {rows.map((r) => (
        <List.Item
          key={r.id}
          id={r.id}
          title={r.label}
          subtitle={r.type}
          accessories={r.meta ? [{ tag: r.meta }] : undefined}
          detail={<List.Item.Detail markdown={`${fence}\n${preview}\n\`\`\``} />}
          actions={
            <ActionPanel>
              {r.canDrill && (
                <Action
                  title="Open Node"
                  onAction={() => setPath((p) => [...p, r.accessor])}
                  shortcut={{ modifiers: ["cmd"], key: "]" }}
                />
              )}
              <BackActions canGoUp={path.length > 0} onBack={() => setPath((p) => p.slice(0, -1))} />
              <Action
                title="Toggle Syntax Highlighting"
                onAction={() => setHighlight((v) => !v)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
              <Action.CopyToClipboard title="Copy Preview" content={preview} />
              <Action
                title="Save Full Node to File"
                onAction={async () => {
                  const value = getNode(node, [r.accessor]);
                  const s = safeStringify(value);
                  const p = join(environment.supportPath, `node-${Date.now()}.json`);
                  await fs.writeFile(p, s, "utf8");
                }}
              />
            </ActionPanel>
          }
        />
      ))}

      {/* Pagination controls */}
      <List.Item
        key="__pagination__"
        title={`Page ${page + 1} / ${pages}`}
        subtitle={`${total} items`}
        actions={
          <ActionPanel>
            <Action
              title="Next Page"
              onAction={() => setPage((x) => Math.min(x + 1, pages - 1))}
              shortcut={{ modifiers: ["cmd"], key: "}" }}
            />
            <Action
              title="Previous Page"
              onAction={() => setPage((x) => Math.max(x - 1, 0))}
              shortcut={{ modifiers: ["cmd"], key: "{" }}
            />
          </ActionPanel>
        }
        detail={<List.Item.Detail markdown="Use ⌘{ and ⌘} to switch pages." />}
      />
    </List>
  );
}

/** Helpers */

// Follow a path from a node (one step or many)
function getNode(current: unknown, path: Path): any {
  return path.reduce((acc: any, seg) => (acc && typeof acc === "object" ? (acc as any)[seg] : undefined), current);
}

// Build a window of children without stringifying everything.
// For arrays: O(1) to compute total, O(page) to list keys.
// For objects: we single-pass iterate keys and only collect the current page.
function listChildrenPaged(node: unknown, page: number, pageSize: number) {
  const start = page * pageSize;
  const end = start + pageSize;

  if (Array.isArray(node)) {
    const total = node.length;
    const slice = Array.from({ length: Math.max(0, Math.min(end, total) - start) }, (_, i) => start + i);
    const rows = slice.map((idx) => {
      const v = (node as any[])[idx];
      const t = typeOf(v);
      return {
        id: String(idx),
        label: String(idx),
        accessor: idx,
        type: t,
        meta:
          t === "array"
            ? `${(v as any[])?.length ?? 0} items`
            : t === "object"
              ? `${Object.keys(v ?? {}).length} keys`
              : undefined,
        canDrill: t === "array" || t === "object",
      };
    });
    return { rows, total };
  }

  if (node && typeof node === "object") {
    let i = 0;
    const rows: any[] = [];
    for (const k in node as Record<string, unknown>) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      if (i >= start && i < end) {
        const v = (node as Record<string, unknown>)[k];
        const t = typeOf(v);
        rows.push({
          id: k,
          label: k,
          accessor: k,
          type: t,
          meta:
            t === "array"
              ? `${(v as any[])?.length ?? 0} items`
              : t === "object"
                ? `${Object.keys(v ?? {}).length} keys`
                : undefined,
          canDrill: t === "array" || t === "object",
        });
      }
      i++;
    }
    const total = i;
    return { rows, total };
  }

  // Primitive: fake one row
  return {
    rows: [{ id: "(value)", label: "(value)", accessor: 0, type: typeOf(node), meta: undefined, canDrill: false }],
    total: 1,
  };
}

function typeOf(v: unknown) {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v; // "object", "string", "number", etc.
}

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    // If cycles exist, fall back to a safe replacer
    const seen = new WeakSet();
    return JSON.stringify(
      v,
      (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return val;
      },
      2,
    );
  }
}
