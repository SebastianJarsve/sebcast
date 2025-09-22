import { environment } from "@raycast/api";
import { createFileAdapter } from "@sebastianjarsve/persistent-atom/adapters";
import path from "path";

export function createRaycastFileAdapter(fileName: string) {
  const filePath = path.join(environment.supportPath, fileName);
  return createFileAdapter(filePath);
}
