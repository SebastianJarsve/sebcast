// src/store/environments.ts
import { randomUUID } from "node:crypto";
import { persistentAtom } from "../lib/persistent-atom";
import { Environment, environmentsSchema, Variable } from "../types";
import { computed } from "nanostores";

export const $environments = persistentAtom<Environment[]>([], {
  backend: "file",
  fileName: "env.json",
  // key: "app-environments",
  serialize: (data) => JSON.stringify(environmentsSchema.parse(data)),
  deserialize: (raw) => {
    return environmentsSchema.parse(JSON.parse(raw));
  },
});

// This will store the ID of the currently active environment
export const $currentEnvironmentId = persistentAtom<string | null>(null, {
  backend: "localStorage",
  key: "app-active-environment-id",
});

export const $currentEnvironment = computed([$currentEnvironmentId, $environments], (id, allEnvironments) => {
  if (!id) return null;
  return allEnvironments.find((c) => c.id === id) ?? null;
});

/**
 * Creates the default "Global" environment object.
 */
function createGlobalEnvironmentObject(): Environment {
  return {
    id: randomUUID(),
    name: "Globals",
    variables: {},
  };
}

/**
 * Checks if the environment store is empty on startup and creates
 * a default "Globals" environment if needed.
 */
async function initializeDefaultEnvironment() {
  await $environments.ready;
  const environments = $environments.get();

  if (environments.length === 0) {
    const globalEnv = createGlobalEnvironmentObject();
    $environments.set([globalEnv]);
    $currentEnvironmentId.set(globalEnv.id); // Automatically select it
  }
}

// --- INITIALIZATION ---

// Run the initialization logic once when the app starts.
initializeDefaultEnvironment();

// --- ACTIONS ---

/**
 * Creates a new, empty environment.
 * @param name The name for the new environment (e.g., "Production").
 */
export async function createEnvironment(name: string) {
  const newEnvironment: Environment = {
    id: randomUUID(),
    name,
    variables: {},
  };
  await $environments.setAndFlush([...$environments.get(), newEnvironment]);
}

/**
 * Updates an environment's properties (e.g., renaming it).
 * @param environmentId The ID of the environment to update.
 * @param data The partial data to update (e.g., `{ name: "New Name" }`).
 */
export async function updateEnvironment(environmentId: string, data: Partial<Environment>) {
  const updated = $environments.get().map((env) => (env.id === environmentId ? { ...env, ...data } : env));
  await $environments.setAndFlush(updated);
}

/**
 * Deletes an entire environment.
 * @param environmentId The ID of the environment to delete.
 */
export async function deleteEnvironment(environmentId: string) {
  const updated = $environments.get().filter((env) => env.id !== environmentId);
  $environments.setAndFlush(updated);

  // If the deleted environment was the active one, clear the active selection.
  if ($currentEnvironmentId.get() === environmentId) {
    await $currentEnvironmentId.setAndFlush(null);
  }
}

// --- VARIABLE ACTIONS ---

/**
 * Creates or updates a variable within a specific environment.
 * @param environmentId The ID of the environment that holds the variable.
 * @param key The key of the variable (e.g., "baseUrl").
 * @param variableData The variable object, including its value and isSecret flag.
 */
export async function saveVariable(environmentId: string, key: string, variableData: Variable) {
  const updated = $environments.get().map((env) => {
    if (env.id === environmentId) {
      // Save the entire variable object, not just the value string
      const newVariables = { ...env.variables, [key]: variableData };
      return { ...env, variables: newVariables };
    }
    return env;
  });
  await $environments.setAndFlush(updated);
}

/**
 * Deletes a variable from a specific environment.
 * @param environmentId The ID of the environment that holds the variable.
 * @param key The key of the variable to delete.
 */
export async function deleteVariable(environmentId: string, key: string) {
  const updated = $environments.get().map((env) => {
    if (env.id === environmentId) {
      const { [key]: _, ...remainingVars } = env.variables;
      return { ...env, variables: remainingVars };
    }
    return env;
  });
  await $environments.setAndFlush(updated);
}

/**
 * Creates or updates a variable in the currently active environment.
 * @param key The key of the variable.
 * @param value The value to save.
 */
export function saveVariableToActiveEnvironment(key: string, value: string) {
  const activeId = $currentEnvironmentId.get();
  if (!activeId) {
    console.warn("No active environment set, cannot save variable.");
    return;
  }

  // For simplicity, we'll mark dynamically saved variables as non-secret by default.
  const variableData: Variable = {
    value,
    isSecret: false,
  };

  saveVariable(activeId, key, variableData);
}
