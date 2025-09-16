// src/components/EnvironmentsActions.tsx
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { RefObject } from "react";
import { resolveVariables } from "../utils";

interface InsertVariableActionProps {
  targetRef: RefObject<Form.TextField | Form.TextArea>;
}

export function InsertVariableAction({ targetRef }: InsertVariableActionProps) {
  const resolvedVariables = resolveVariables();
  const variableKeys = Object.keys(resolvedVariables);

  return (
    <ActionPanel.Submenu title="Insert Variable" icon={Icon.Key} shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}>
      {variableKeys.length > 0 ? (
        variableKeys.map((key) => (
          <Action
            key={key}
            title={key}
            onAction={() => {
              const field = targetRef.current;
              if (!field) return;

              // const originalValue = field.value || "";
              // const placeholder = `{{${key}}}`;

              // // Use the imperative API to set the new value
              // field.setValue(originalValue + placeholder);
            }}
          />
        ))
      ) : (
        <Action title="No Variables in Scope" />
      )}
    </ActionPanel.Submenu>
  );
}
