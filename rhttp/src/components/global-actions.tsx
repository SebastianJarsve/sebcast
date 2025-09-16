import { Action, ActionPanel, Icon, showToast } from "@raycast/api";
import { useAtom } from "../store";
import { $currentEnvironment, $currentEnvironmentId, $environments } from "../store/environments";
import { ManageVariablesList } from "../views/manage-variables-list";
import { HistoryView } from "../views/history-list-view";
import { $isHistoryEnabled } from "../store/settings";

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
  const { value: isHistoryEnabled } = useAtom($isHistoryEnabled);
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

      <ActionPanel.Section title="History">
        <Action.Push
          title="View History"
          icon={Icon.Clock}
          target={<HistoryView />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
        <Action
          title={isHistoryEnabled ? "Disable History" : "Enable History"}
          icon={isHistoryEnabled ? Icon.Stop : Icon.Clock}
          onAction={() => {
            showToast({ title: !isHistoryEnabled ? "Recording history" : "Stopped recording history" });
            $isHistoryEnabled.set(!isHistoryEnabled);
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      </ActionPanel.Section>
    </>
  );
}
