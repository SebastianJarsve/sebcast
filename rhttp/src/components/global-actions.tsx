import { Action, ActionPanel, Icon } from "@raycast/api";
import { useAtom } from "../store";
import { $currentEnvironment, $currentEnvironmentId, $environments } from "../environments";
import { ManageVariablesList } from "../views/manage-variables-list";

function SelectEnvironmentMenu() {
  const { value: currentEnvironment } = useAtom($currentEnvironment);
  const { value: allEnvironments } = useAtom($environments);
  return (
    <ActionPanel.Submenu
      title="Select environment"
      icon={Icon.Key}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      {allEnvironments.map((env) => (
        <Action
          key={env.id}
          title={(currentEnvironment?.id === env.id ? `✅ ` : "") + env.name}
          onAction={() => $currentEnvironmentId?.set(env?.id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function GlobalActions() {
  return (
    <>
      <ActionPanel.Section title="Environment">
        <SelectEnvironmentMenu />

        <Action.Push
          title="Manage Environments"
          icon={Icon.Pencil}
          target={<ManageVariablesList />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
      </ActionPanel.Section>
    </>
  );
}
