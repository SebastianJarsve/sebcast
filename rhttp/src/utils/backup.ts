import { environment } from "@raycast/api";
import { WritableAtom } from "nanostores";
import path from "path";
import fs from "fs/promises";
import { $collections } from "~/store";
import z from "zod";
import { collectionSchema, environmentsSchema, historySchema } from "~/types";
import { $environments } from "~/store/environments";
import { $history } from "~/store/history";

/**
 * Exports the current state of a Nanostores atom to a specified file.
 * @param atom The atom to export.
 * @param serialize A function to convert the atom's data to a string.
 * @param fileName The name of the file to save in the support path.
 */
export async function exportAtomToFile<T>(atom: WritableAtom<T>, serialize: (v: T) => string, filePath: string) {
  const serializedValue = serialize(atom.get());
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, serializedValue);
}

/**
 * The main function for creating a full backup of all data.
 */
export async function backupAllData() {
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const backupDir = path.join(environment.supportPath, "backups", timestamp);

  // Define the files and their corresponding stores and serializers
  const backupTasks = [
    {
      atom: $collections,
      serializer: (d: any) => JSON.stringify(z.array(collectionSchema).parse(d)),
      path: path.join(backupDir, "collections.json"),
    },
    {
      atom: $environments,
      serializer: (d: any) => JSON.stringify(environmentsSchema.parse(d)),
      path: path.join(backupDir, "environments.json"),
    },
    {
      atom: $history,
      serializer: (d: any) => JSON.stringify(historySchema.parse(d)),
      path: path.join(backupDir, "history.json"),
    },
  ];

  // Run all backup tasks in parallel for efficiency
  await Promise.all(backupTasks.map((task) => exportAtomToFile(task.atom, task.serializer, task.path)));
}
