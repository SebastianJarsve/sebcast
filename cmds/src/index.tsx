import { AllCommands } from "./views/commands";
import { useCommands } from "./items";

export default function Entrypoint() {
  const localStorage = useCommands();
  return <AllCommands {...localStorage} />;
}
