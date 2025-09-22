// src/components/KeyValueEditor.tsx
import { Form } from "@raycast/api";
import { Fragment, useState } from "react";

type Pair = { key: string; value: string };

interface KeyValueEditorProps {
  title: string;
  pairs: Pair[];
  onPairsChange: (newPairs: Pair[]) => void;
  commonKeys?: readonly string[];
  onActiveIndexChange: (index: number | null) => void;
}

export function KeyValueEditor({ title, pairs, onPairsChange, commonKeys, onActiveIndexChange }: KeyValueEditorProps) {
  const [keySearchTexts, setKeySearchTexts] = useState<string[]>([]);

  return (
    <>
      <Form.Description text={title} />
      {pairs.map((pair, index) => {
        // Build the list of options for the dropdown if needed
        const currentKeysInUse = pairs.map((p) => p.key).filter(Boolean);
        const searchText = keySearchTexts[index];
        const allOptions = Array.from(
          new Set([...(commonKeys ?? []), ...currentKeysInUse, searchText].filter(Boolean)),
        );

        const handleKeyChange = (newKey: string) => {
          const newPairs = [...pairs];
          newPairs[index].key = newKey;
          onPairsChange(newPairs);
        };

        const handleValueChange = (newValue: string) => {
          const newPairs = [...pairs];
          newPairs[index].value = newValue;
          onPairsChange(newPairs);
        };

        return (
          <Fragment key={index}>
            {commonKeys ? (
              // Render an auto-complete Dropdown if commonKeys are provided
              <Form.Dropdown
                id={`${title}-key-${index}`}
                title="Key"
                value={pair.key}
                onFocus={() => onActiveIndexChange(index)}
                onChange={handleKeyChange}
                onSearchTextChange={(text) => {
                  const newTexts = [...keySearchTexts];
                  newTexts[index] = text;
                  setKeySearchTexts(newTexts);
                }}
              >
                {allOptions.map((key) => (
                  <Form.Dropdown.Item key={key} value={key} title={key} />
                ))}
              </Form.Dropdown>
            ) : (
              // Otherwise, render a simple TextField
              <Form.TextField
                id={`${title}-key-${index}`}
                title="Key"
                value={pair.key}
                onChange={handleKeyChange}
                onFocus={() => onActiveIndexChange(index)}
              />
            )}

            <Form.TextField
              id={`${title}-value-${index}`}
              title="Value"
              value={pair.value}
              onChange={handleValueChange}
              onFocus={() => onActiveIndexChange(index)}
            />
          </Fragment>
        );
      })}
    </>
  );
}
