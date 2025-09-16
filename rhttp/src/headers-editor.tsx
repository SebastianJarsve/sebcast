// src/components/HeadersEditor.tsx
import { Form } from "@raycast/api";
import { useState, Fragment, Dispatch, SetStateAction, MutableRefObject } from "react";
import { Headers } from "./types";
import { COMMON_HEADER_KEYS } from "./constants";

interface HeadersEditorProps {
  headers: Headers;
  onHeadersChange: (newHeaders: Headers) => void;
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  headerFieldRefs: MutableRefObject<(Form.Dropdown | null)[]>;
}

export function HeadersEditor({
  headers,
  onHeadersChange,
  activeIndex,
  setActiveIndex,
  headerFieldRefs,
}: HeadersEditorProps) {
  const [headerSearchTexts, setHeaderSearchTexts] = useState<string[]>([]);

  return (
    <Fragment>
      <Form.Description title="Headers" text={"Manage collection-specific headers."} />
      {headers.map((header, index) => (
        <Fragment key={`header-${index}`}>
          {activeIndex === index && <Form.Description text="Active Header 👉" />}
          <Form.Dropdown
            ref={(el) => (headerFieldRefs.current[index] = el)}
            id={`header-key-${index}`}
            title="Key"
            value={header.key}
            onFocus={() => setActiveIndex(index)}
            onChange={(newKey) => {
              const newHeaders = [...headers];
              newHeaders[index].key = newKey;
              onHeadersChange(newHeaders);
            }}
            onSearchTextChange={(text) => {
              const newTexts = [...headerSearchTexts];
              newTexts[index] = text;
              setHeaderSearchTexts(newTexts);
            }}
          >
            <Form.Dropdown.Section>
              {headerSearchTexts[index] && !COMMON_HEADER_KEYS.includes(headerSearchTexts[index] as any) && (
                <Form.Dropdown.Item value={headerSearchTexts[index]} title={headerSearchTexts[index]} />
              )}
              {COMMON_HEADER_KEYS.filter((key) => {
                const searchText = headerSearchTexts[index];
                if (!searchText) return true;
                return key.toLowerCase().includes(searchText.toLowerCase());
              }).map((key) => (
                <Form.Dropdown.Item key={key} value={key} title={key} />
              ))}
            </Form.Dropdown.Section>
          </Form.Dropdown>

          <Form.TextField
            id={`header-value-${index}`}
            title="Value"
            placeholder="Header value"
            value={header.value}
            onFocus={() => setActiveIndex(index)}
            onChange={(newValue) => {
              const newHeaders = [...headers];
              newHeaders[index].value = newValue;
              onHeadersChange(newHeaders);
            }}
          />
        </Fragment>
      ))}
    </Fragment>
  );
}
