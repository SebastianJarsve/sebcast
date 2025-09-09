// src/views/ManageVariablesList.tsx
import { Action, ActionPanel, List, Icon, confirmAlert, showToast, Alert, Toast } from "@raycast/api";
import { useAtom } from "../store";
import {
  $environments,
  $currentEnvironmentId,
  deleteVariable,
  deleteEnvironment,
  $currentEnvironment,
} from "../environments";
import { EnvironmentForm } from "./environment-form";
import { VariableForm } from "./variable-form";
// We will need forms for these, which we can build next
// import { EnvironmentForm } from "./EnvironmentForm";
// import { VariableForm } from "./VariableForm";

function EnvironmentDropdown() {
  const { value: environments } = useAtom($environments);
  const { value: activeId } = useAtom($currentEnvironmentId);

  return (
    <List.Dropdown
      tooltip="Select Environment"
      value={activeId ?? undefined}
      onChange={(newValue) => $currentEnvironmentId.set(newValue)}
    >
      <List.Dropdown.Section title="Environments">
        {environments.map((env) => (
          <List.Dropdown.Item key={env.id} title={env.name} value={env.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function GlobalActions() {
  const { value: currentEnvironment } = useAtom($currentEnvironment);
  return (
    <>
      {/* Actions for the selected environment */}
      {currentEnvironment?.id && (
        <Action.Push title="Add Variable" target={<VariableForm environmentId={currentEnvironment?.id} />} />
      )}

      <Action.Push
        title="Edit Environment"
        target={<EnvironmentForm environmentId={currentEnvironment?.id} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
      />
      <Action.Push
        title="Create New Environment"
        target={<EnvironmentForm />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      />
      {currentEnvironment && currentEnvironment.name !== "Globals" && (
        <Action
          title="Delete Environment"
          style={Action.Style.Destructive}
          onAction={async () => {
            if (
              await confirmAlert({
                title: `Delete "${currentEnvironment.name}"?`,
                message: "All variables within this environment will be deleted.",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              })
            ) {
              await deleteEnvironment(currentEnvironment.id);
              await showToast({ style: Toast.Style.Success, title: "Environment Deleted" });
            }
          }}
        />
      )}
    </>
  );
}
export function ManageVariablesList() {
  const { value: environments } = useAtom($environments);
  const { value: activeId } = useAtom($currentEnvironmentId);

  const currentEnvironment = environments.find((env) => env.id === activeId);
  const variables = currentEnvironment ? Object.entries(currentEnvironment.variables) : [];

  return (
    <List
      navigationTitle="Manage Variables"
      searchBarAccessory={<EnvironmentDropdown />}
      actions={
        <ActionPanel>
          <GlobalActions />
        </ActionPanel>
      }
    >
      {variables.map(([key, variable]) => (
        <List.Item
          key={key}
          title={key}
          accessories={[{ text: variable.isSecret ? "********" : variable.value }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Variable"
                target={<VariableForm environmentId={currentEnvironment!.id} variableKey={key} />}
              />
              {currentEnvironment && (
                <Action
                  title="Delete Variable"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: `Delete Variable "${key}"?`,
                        message: "This action cannot be undone.",
                        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await deleteVariable(currentEnvironment.id, key);
                      await showToast({ style: Toast.Style.Success, title: "Variable Deleted" });
                    }
                  }}
                />
              )}

              <ActionPanel.Section title="Global">
                <GlobalActions />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
