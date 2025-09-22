// src/components/AccessoryDropdown.tsx
import { List } from "@raycast/api";
import { $collections, $currentCollectionId } from "../store";
import { $environments, $currentEnvironmentId } from "../store/environments";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";

export function AccessoryDropdown() {
  const { value: collections } = useAtom($collections);
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: environments } = useAtom($environments);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);

  // Find the full object for the active environment to get its name
  const activeEnvironment = environments.find((e) => e.id === currentEnvironmentId);

  function handleChange(newValue: string) {
    if (newValue.startsWith("coll_")) {
      const collectionId = newValue.substring(5);
      $currentCollectionId.set(collectionId); // Use renamed atom
    } else if (newValue.startsWith("env_")) {
      const environmentId = newValue.substring(4);
      $currentEnvironmentId.set(environmentId); // Use renamed atom
    }
  }

  return (
    <List.Dropdown
      tooltip="Switch Collection or Environment"
      value={currentCollectionId ? `coll_${currentCollectionId}` : undefined} // Use renamed variable
      onChange={handleChange}
    >
      <List.Dropdown.Section title="Collections">
        {collections.map((c) => {
          // --- THIS IS THE NEW PART ---
          // If this is the currently selected collection, append the active environment's name.
          const isCurrentCollection = c.id === currentCollectionId;
          const envName = activeEnvironment?.name ?? "No Env";
          const displayTitle = isCurrentCollection ? `${c.title} (${envName})` : c.title;

          return <List.Dropdown.Item key={`coll_${c.id}`} title={displayTitle ?? ""} value={`coll_${c.id}`} />;
        })}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Environments">
        {environments.map((env) => (
          <List.Dropdown.Item
            key={env.id}
            title={env.name ?? ""}
            value={`env_${env.id}`} // Add "env_" prefix
            icon={env.id === currentEnvironmentId ? "✅" : undefined}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
