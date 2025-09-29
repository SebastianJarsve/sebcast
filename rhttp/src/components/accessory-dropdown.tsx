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

  function handleChange(collectionId: string) {
    const currentCollection = collections.find((c) => c.id === currentCollectionId);
    $currentCollectionId.set(collectionId);
    $currentEnvironmentId.set(currentCollection?.lastActiveEnvironmentId ?? null);
  }

  return (
    <List.Dropdown
      tooltip="Switch Collection or Environment"
      value={currentCollectionId ? currentCollectionId : undefined} // Use renamed variable
      onChange={handleChange}
    >
      <List.Dropdown.Section title="Collections">
        {collections.map((c) => {
          // If this is the currently selected collection, append the active environment's name.
          const isCurrentCollection = c.id === currentCollectionId;
          const envName = activeEnvironment?.name ?? "No Env";
          const displayTitle = isCurrentCollection ? `${c.title} (${envName})` : c.title;

          return <List.Dropdown.Item key={c.id} title={displayTitle ?? ""} value={`coll_${c.id}`} />;
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
