import { List, ActionPanel, Action, environment, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "fs/promises";
import { join } from "path";

type Path = (string | number)[];

export type JSONExplorerProps = {
  /** A pre-parsed JavaScript object/array */
  data?: unknown;
  /** A raw JSON string (the component will parse it). */
  json?: string;
  title?: string;
  pageSize?: number;
  previewLimit?: number;
};

/* ---------- Main Component ---------- */

export function JSONExplorer({
  data,
  json,
  title = "JSON Explorer",
  pageSize = 20,
  previewLimit = 4000,
}: JSONExplorerProps) {
  const root = useMemo(() => {
    if (json !== undefined) {
      try {
        return JSON.parse(json);
      } catch {
        return { Error: "Invalid JSON string provided.", raw: json };
      }
    }
    return data;
  }, [json, data]);
  const [path, setPath] = useState<Path>([]);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const node = useMemo(() => getNode(root, path), [root, path]);
  const { rows, total } = useMemo(() => listChildrenPaged(node, page, pageSize), [node, page, pageSize]);
  const onPrev = () => {
    setPage((x) => Math.max(0, x - 1));
    // 3. Reset the selection when the page changes
    setTimeout(() => {
      if (pages > 1) setSelectedId("next-page");
      else setSelectedId("back-action");
    }, 50);
  };
  const onNext = () => {
    setPage((x) => Math.min(pages - 1, x + 1));
    // 3. Reset the selection when the page changes
    setTimeout(() => {
      setSelectedId("prev-page");
    }, 50);
  };
  // Optimized preview logic
  const [preview, setPreview] = useState<string>("");
  useEffect(() => {
    const rowToPreview = rows.find((r) => r.id === selectedId) ?? rows[0];
    if (!rowToPreview) {
      setPreview("Select an item to see its value.");
      return;
    }
    const value = rowToPreview.kind === "child" ? getNode(node, [rowToPreview.accessor]) : node;
    const stringifiedValue = safeStringify(value);
    const previewContent =
      stringifiedValue.length > previewLimit
        ? stringifiedValue.slice(0, previewLimit) + "\n\n... (truncated)"
        : stringifiedValue;
    setPreview(`\`\`\`json\n${previewContent}\n\`\`\``);
  }, [selectedId, rows, node, previewLimit]);

  useEffect(() => {
    setPage(0);
    setSelectedId(undefined);
  }, [path.join("/")]);

  const breadcrumb = "/" + (path.length ? path.map(String).join("/") : "");
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <List
      navigationTitle={"Explore JSON" + (pages > 1 ? ` (Page ${page + 1} of ${pages})` : "")}
      isShowingDetail
      searchBarPlaceholder={`Browse ${title} — ${breadcrumb}`}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      selectedItemId={selectedId ?? undefined}
      throttle
    >
      {path.length > 0 && (
        <List.Item
          id="back-action"
          title=".."
          subtitle="Up one level"
          actions={
            <ActionPanel>
              <BackActions canGoUp onBack={() => setPath((p) => p.slice(0, -1))} />
              {pages > 1 && <PaginationActions page={page} pages={pages} onNext={onNext} onPrev={onPrev} />}
            </ActionPanel>
          }
        />
      )}
      {rows.map((r) => (
        <List.Item
          key={r.id}
          id={r.id}
          title={r.label}
          subtitle={r.type}
          accessories={r.meta ? [{ tag: r.meta }] : undefined}
          detail={<List.Item.Detail markdown={preview} />}
          actions={
            <ActionPanel>
              {r.canDrill && <Action title="Open Node" onAction={() => setPath((p) => [...p, r.accessor])} />}
              <BackActions canGoUp={path.length > 0} onBack={() => setPath((p) => p.slice(0, -1))} />
              <Action.CopyToClipboard title="Copy Node" content={safeStringify(node)} />
              <Action.CopyToClipboard title="Copy Preview" content={preview} />
              <SaveSelectedAction value={getNode(node, [r.accessor])} />
              <PaginationActions page={page} pages={pages} onPrev={onPrev} onNext={onNext} />
            </ActionPanel>
          }
        />
      ))}
      {/*
      {pages > 1 && page > 0 && (
        <List.Section title={`Page ${page + 1} of ${pages}`}>
          <List.Item
            id="prev-page"
            title="... Previous Page"
            icon={Icon.ArrowUp}
            actions={
              <ActionPanel>
                <Action title="Go to Previous Page" onAction={onPrev} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {pages > 1 && page < pages - 1 && (
        <List.Section title={`Page ${page + 1} of ${pages}`}>
          <List.Item
            id="next-page"
            title="Next Page ..."
            icon={Icon.ArrowDown}
            actions={
              <ActionPanel>
                <Action title="Go to Next Page" onAction={onNext} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      */}
    </List>
  );
}

/* ---------- Actions (small components) ---------- */

function BackActions({ onBack, canGoUp }: { canGoUp?: boolean; onBack: () => void }) {
  if (!canGoUp) return null;
  return <Action title="Up One Level" onAction={onBack} shortcut={{ modifiers: [], key: "backspace" }} />;
}

function PaginationActions({
  page,
  pages,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (pages <= 1) return null;
  return (
    <ActionPanel.Section title={`Page ${page} of ${pages}`}>
      <Action title="Previous Page" onAction={onPrev} shortcut={{ modifiers: [], key: "pageUp" }} />
      <Action title="Next Page" onAction={onNext} shortcut={{ modifiers: [], key: "pageDown" }} />
    </ActionPanel.Section>
  );
}

function SaveSelectedAction({ value }: { value: unknown }) {
  return (
    <Action
      title="Save Node to File"
      icon={Icon.Download}
      onAction={async () => {
        const s = safeStringify(value);
        const p = join(environment.supportPath, `json-node-${Date.now()}.json`);
        await fs.writeFile(p, s, "utf8");
        await showToast({ style: Toast.Style.Success, title: "Saved Node to File", message: p });
      }}
    />
  );
}

/* ---------- Helpers ---------- */

function getNode(current: unknown, path: Path): any {
  return path.reduce((acc: any, seg) => (acc && typeof acc === "object" ? acc[seg] : undefined), current);
}

function listChildrenPaged(node: unknown, page: number, pageSize: number) {
  const start = page * pageSize;
  const end = start + pageSize;

  if (Array.isArray(node)) {
    const total = node.length;
    const slice = Array.from({ length: Math.min(end, total) - start }, (_, i) => start + i);
    const rows = slice.map((idx) => {
      const v = node[idx];
      const t = typeOf(v);
      return {
        id: String(idx),
        label: String(idx),
        accessor: idx,
        type: t,
        meta: t === "array" ? `${v.length} items` : t === "object" ? `${Object.keys(v ?? {}).length} keys` : undefined,
        canDrill: t === "array" || t === "object",
        kind: "child" as const,
      };
    });
    return { rows, total };
  }

  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    const total = keys.length;
    const slice = keys.slice(start, end);
    const rows = slice.map((k) => {
      const v = (node as Record<string, unknown>)[k];
      const t = typeOf(v);
      return {
        id: k,
        label: k,
        accessor: k,
        type: t,
        meta:
          t === "array"
            ? `${(v as any[]).length} items`
            : t === "object"
              ? `${Object.keys(v ?? {}).length} keys`
              : undefined,
        canDrill: t === "array" || t === "object",
        kind: "child" as const,
      };
    });
    return { rows, total };
  }

  return { rows: [], total: 0 };
}

function typeOf(v: unknown) {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    const seen = new WeakSet();
    return JSON.stringify(
      v,
      (_, val) => {
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
