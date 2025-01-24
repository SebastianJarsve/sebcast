import { ActionPanel, List, Action } from "@raycast/api";
import * as tools from "./commands";

export default function Command() {
  return (
    <List>
      {Object.values(tools).map((Tool) => (
        <List.Item
          key={Tool.displayName}
          title={Tool.displayName}
          subtitle={Tool.description}
          icon={Tool.icon}
          actions={
            <ActionPanel>
              <Action.Push title="Open tool" target={<Tool />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
