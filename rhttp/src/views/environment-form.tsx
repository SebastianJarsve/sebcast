import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { $environments, createEnvironment, updateEnvironment } from "../store/environments";
import { useAtom } from "@sebastianjarsve/persistent-atom/react";
import { GLOBAL_ENVIRONMENT_NAME } from "~/constants";

interface EnvironmentFormProps {
  environmentId?: string;
}

export function EnvironmentForm({ environmentId }: EnvironmentFormProps) {
  const { pop } = useNavigation();
  const { value: environments } = useAtom($environments);
  const environmentToEdit = environments.find((e) => e.id === environmentId);

  async function handleSubmit(values: { name: string }) {
    const newName = values.name.trim();

    // Check if another environment (with a different ID) already has this name.
    const isNameTaken = environments.some(
      (env) => env.name.toLowerCase() === newName.toLowerCase() && env.id !== environmentId,
    );

    if (isNameTaken) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name Already Taken",
        message: `An environment named "${newName}" already exists.`,
      });
      return; // Stop the submission
    }

    // The rest of the function is the same
    try {
      if (environmentId) {
        if (environmentToEdit?.name === GLOBAL_ENVIRONMENT_NAME) {
          showToast({ style: Toast.Style.Failure, title: "Cannot rename the Globals environment" });
          return;
        }
        await updateEnvironment(environmentId, { name: newName });
        showToast({ title: "Environment Updated" });
      } else {
        await createEnvironment(newName);
        showToast({ title: "Environment Created" });
      }
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to save environment", message: String(error) });
    }
  }
  return (
    <Form
      navigationTitle={environmentId ? "Edit Environment" : "Create Environment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Environment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Environment Name"
        placeholder="e.g., Staging"
        defaultValue={environmentToEdit?.name}
      />
    </Form>
  );
}
