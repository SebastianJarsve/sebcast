import { environment } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "crypto";
import { join } from "path";
import { Item, Items } from "./types";

const defaultItems: Item[] = [
  {
    title: "Get nodes in namespace",
    command: "kubectl -n {namespace} get nodes",
    tags: ["kubectl"],
  },
  {
    title: "Get pods in namespace",
    command: "kubectl -n {namespace} get pods",
    tags: ["kubectl"],
  },
  {
    title: "Get logs",
    command: "kubectl -n {namespace} logs {pod}",
    tags: ["kubectl"],
  },
  {
    title: "Get events",
    command: "kubectl -n {namespace} get events",
    tags: ["kubectl"],
  },
  {
    title: "Copy file to pod",
    command: "kubectl -n {namespace} cp {local file path} {pod}:{pod file path}",
    tags: ["kubectl"],
  },
  {
    title: "Copy file from pod",
    command: "kubectl -n {namespace} cp {pod}:{pod file path} {local file path}",
    tags: ["kubectl"],
  },
  {
    title: "Connect to a pod's shell",
    command: "kubectl -n {namespace} exec --stdin --tty {pod} -- /bin/bash",
    tags: ["kubectl"],
  },
  {
    title: "Redeploy deployment / restart deployment",
    command: "kubectl rollout restart deployment -n inside inside-ui",
    notes: "This will not introduce downtime. Can be used to restart the pods in the deployment.",
    tags: ["kubectl"],
  },
  {
    title: "Upgrade application in kubernetes with helm",
    command: "helm upgrade {release} -n {namespace} -f {values file} {binary file}",
    tags: ["helm"],
  },
  {
    title: "Get number of replicas in a deployment",
    command: "kubectl -n {namespace} get deployments.apps {deployment} -o=jsonpath='{.status.replicas}{\"\\n\"}'",
    tags: ["kubectl"],
  },
  {
    title: "Get number of replicas in a statefulset",
    command: "kubectl -n {namespace} get statefulsets.apps {statefulset} -o=jsonpath='{.status.replicas}{\"\\n\"}'",
    tags: ["kubectl"],
  },
  {
    title: "Scale down replicas",
    command: "kubectl -n {namespace} scale deployment {application} --replicas=0",
    tags: ["kubectl", "scale"],
  },
  {
    title: "Format json files correctly in vim",
    command: "%!jq .",
    tags: ["vim", "json"],
    notes: "Used in command mode.",
  },
  {
    title: "Git get remote url",
    command: "git config --get remote.origin.url",
    tags: ["git", "remote"],
  },
  {
    title: "Number of occurrences in Vim.",
    command: "%s/search//gn",
    tags: ["vim"],
    notes: "Used in command mode.",
  },
  {
    title: "Untar .tgz file",
    command: "tar -xvzf ",
    tags: ["bash", "terminal"],
    notes: "Untar a .tgz file",
  },
  {
    title: "Authentik admin access",
    command: "kubectl exec -it deployment/authentik-worker -n authentik -c authentik -- ak create_admin_group username",
    tags: ["authentik"],
    notes: "This will give you admin access if you're ever locked out.",
  },
  {
    title: "PSQL less is more",
    command: "\\setenv PAGER 'less -S'",
    tags: ["psql"],
    notes: "This sets the psql pages to less instead of more.",
  },
  {
    title: "Switch kube config",
    command: `(cd ~/.kube/; ln -sf config-{config} config && kubectl get nodes)`,
  },
].map((item) => ({ ...item, id: randomUUID() }));

// Get support path of file to use
const dataFile = join(environment.supportPath, "data.json");

function useCommands() {
  console.log(environment.supportPath);
  const commands = useLocalStorage<Items>("commands", defaultItems);

  return { ...commands };
}

type Commands = ReturnType<typeof useCommands>;

export { defaultItems, useCommands };
export type { Commands };
