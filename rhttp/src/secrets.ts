// src/store/secrets.ts
import { randomUUID } from "node:crypto";
import { persistentAtom } from "./persistent-atom";
import { Secret, secretsSchema } from "./types";

export const $secrets = persistentAtom<Secret[]>([], {
  backend: "localStorage",
  key: "app-secrets",
  serialize: (data) => JSON.stringify(secretsSchema.parse(data)),
  deserialize: (raw) => secretsSchema.parse(JSON.parse(raw)),
});

export function createSecret(data: Omit<Secret, "id">) {
  const newSecret: Secret = { ...data, id: randomUUID() };
  $secrets.set([...$secrets.get(), newSecret]);
}

export function updateSecret(secretId: string, data: Partial<Secret>) {
  const updatedSecrets = $secrets.get().map((s) => (s.id === secretId ? { ...s, ...data } : s));
  $secrets.set(updatedSecrets);
}

export function deleteSecret(secretId: string) {
  const updatedSecrets = $secrets.get().filter((s) => s.id !== secretId);
  $secrets.set(updatedSecrets);
}
