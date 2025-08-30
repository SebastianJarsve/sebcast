// JSONExplorer.tsx
import { List, ActionPanel, Action, environment, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "fs/promises";
import { join } from "path";

type Path = (string | number)[];

export type JSONExplorerProps = {
  /** Either pass a parsed value… */
  data?: unknown;
  /** …or a raw JSON string (will be parsed). If invalid, it will be shown under { raw: "…" }. */
  json?: string;
  title?: string;
  pageSize?: number; // default 200
  previewLimit?: number; // default 4000 chars
  initialHighlight?: boolean; // default true
  startPath?: Path; // optional initial location
};

export default function JSONExplorer({
  data,
  json,
  title = "JSON",
  pageSize = 200,
  previewLimit = 4000,
  initialHighlight = true,
  startPath = [],
}: JSONExplorerProps) {
  const root = useMemo(() => {
    if (json !== undefined) {
      try {
        return JSON.parse(json);
      } catch {
        return { raw: json }; // still browsable
      }
    }
    return data;
  }, [json, data]);

  const [path, setPath] = useState<Path>(startPath);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [highlight, setHighlight] = useState(initialHighlight);

  // Current node at this path
  const node = useMemo(() => getNode(root, path), [root, path]);

  // Build a paged list of children (NO stringify here)
  const { rows, total } = useMemo(() => listChildrenPaged(node, page, pageSize), [node, page, pageSize]);

  // Selected row
  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedId) ?? rows[0], [rows, selectedId]);

  // Compute preview ONLY for selected row (stringify once)
  const [preview, setPreview] = useState<string>("");
  useEffect(() => {
    if (!selectedRow) {
      setPreview("");
      return;
    }
    const value = selectedRow.kind === "child" ? getNode(node, [selectedRow.accessor]) : node;

    const s = safeStringify(value);
    setPreview(s.length > previewLimit ? s.slice(0, previewLimit) + "\n… (truncated)" : s);
  }, [selectedRow, node, previewLimit]);

  // Reset paging/selection when path changes
  useEffect(() => {
    setPage(0);
    setSelectedId(undefined);
  }, [path.join("/")]);

  const fence = highlight ? "```json" : "```text";
  const breadcrumb = "/" + (path.length ? path.map(String).join("/") : "");
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={`${title} — ${breadcrumb || "/"}  (page ${page + 1}/${pages})`}
      onSelectionChange={(id) => setSelectedId(id)}
      selectedItemId={selectedId}
      throttle
      filtering
    >
      {/* Up one level */}
      {path.length > 0 && (
        <List.Item
          id=".."
          title=".."
          subtitle="Up one level"
          accessories={[{ tag: breadcrumb || "/" }]}
          detail={<List.Item.Detail markdown="Go up one level" />}
          actions={
            <ActionPanel>
              <Action
                title="Up One Level"
                onAction={() => setPath((p) => p.slice(0, -1))}
                shortcut={{ key: "backspace" }}
              />
              <Action
                title="Up One Level"
                onAction={() => setPath((p) => p.slice(0, -1))}
                shortcut={{ key: "escape" }}
              />
              <Action
                title="Up One Level"
                onAction={() => setPath((p) => p.slice(0, -1))}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Value-only view when primitive or empty */}
      {rows.length === 0 && (
        <List.Item
          id="(value)"
          title="(value)"
          subtitle={typeOf(node)}
          detail={<List.Item.Detail markdown={`${fence}\n${preview}\n\`\`\``} />}
          actions={
            <ActionPanel>
              <BackActions canGoUp={path.length > 0} onBack={() => setPath((p) => p.slice(0, -1))} />
              <Action.CopyToClipboard title="Copy Value" content={preview} />
              <SaveSelectedAction value={node} />
              <ToggleHighlightAction onToggle={() => setHighlight((v) => !v)} />
            </ActionPanel>
          }
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
                  shortcut={{ key: "enter" }}
                />
              )}
              <BackActions canGoUp={path.length > 0} onBack={() => setPath((p) => p.slice(0, -1))} />
              <Action.CopyToClipboard title="Copy Preview" content={preview} />
              <SaveSelectedAction value={getNode(node, [r.accessor])} />
              <ToggleHighlightAction onToggle={() => setHighlight((v) => !v)} />
              <PaginationActions
                page={page}
                pages={pages}
                onPrev={() => setPage((x) => Math.max(0, x - 1))}
                onNext={() => setPage((x) => Math.min(pages - 1, x + 1))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/* ---------- Actions (small components) ---------- */

function BackActions({ canGoUp, onBack }: { canGoUp: boolean; onBack: () => void }) {
  if (!canGoUp) return null;
  return (
    <>
      <Action title="Up One Level" onAction={onBack} shortcut={{ key: "backspace" }} />
      <Action title="Up One Level" onAction={onBack} shortcut={{ key: "escape" }} />
      <Action title="Up One Level" onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
    </>
  );
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
  return (
    <>
      <Action
        title={`Previous Page (${page}/${pages})`}
        onAction={onPrev}
        shortcut={{ modifiers: ["cmd"], key: "{" }}
      />
      <Action
        title={`Next Page (${page + 1}/${pages})`}
        onAction={onNext}
        shortcut={{ modifiers: ["cmd"], key: "}" }}
      />
    </>
  );
}

function ToggleHighlightAction({ onToggle }: { onToggle: () => void }) {
  return (
    <Action
      title="Toggle Syntax Highlighting"
      onAction={onToggle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
    />
  );
}

function SaveSelectedAction({ value }: { value: unknown }) {
  return (
    <Action
      title="Save Node to File"
      onAction={async () => {
        const s = safeStringify(value);
        const p = join(environment.supportPath, `json-node-${Date.now()}.json`);
        await fs.writeFile(p, s, "utf8");
        await showToast({ style: Toast.Style.Success, title: "Saved", message: p });
      }}
    />
  );
}

/* ---------- Helpers ---------- */

function getNode(current: unknown, path: Path): any {
  return path.reduce((acc: any, seg) => (acc && typeof acc === "object" ? (acc as any)[seg] : undefined), current);
}

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
        accessor: idx as number,
        type: t,
        meta:
          t === "array"
            ? `${(v as any[])?.length ?? 0} items`
            : t === "object"
              ? `${Object.keys(v ?? {}).length} keys`
              : undefined,
        canDrill: t === "array" || t === "object",
        kind: "child" as const,
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
          kind: "child" as const,
        });
      }
      i++;
    }
    const total = i;
    return { rows, total };
  }

  // Primitive: single synthetic row (lets you still copy/save)
  return {
    rows: [
      {
        id: "(value)",
        label: "(value)",
        accessor: 0,
        type: typeOf(node),
        meta: undefined,
        canDrill: false,
        kind: "self" as const,
      },
    ],
    total: 1,
  };
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
    // Handle cycles gracefully
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
