import { useMemo } from "react";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { $environments, $currentEnvironmentId } from "~/store/environments";
import { GLOBAL_ENVIRONMENT_NAME } from "~/constants";

/**
 * Hook to get the resolved variables from the current environment.
 * Merges global variables with active environment variables.
 * Safe to use during render - waits for atom hydration.
 */
export function useVariables(): Record<string, string> {
  const { value: environments } = useAtom($environments);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);

  return useMemo(() => {
    const globalEnv = environments.find((e) => e.name === GLOBAL_ENVIRONMENT_NAME);
    const activeEnv = environments.find((e) => e.id === currentEnvironmentId);

    const resolved: Record<string, string> = {};

    // Add global variables first
    if (globalEnv) {
      for (const [key, variable] of Object.entries(globalEnv.variables)) {
        resolved[key] = variable.value;
      }
    }

    // Add active environment variables (overrides globals)
    if (activeEnv) {
      for (const [key, variable] of Object.entries(activeEnv.variables)) {
        resolved[key] = variable.value;
      }
    }

    return resolved;
  }, [environments, currentEnvironmentId]);
}
