// src/store/secrets.ts
import { persistentAtom } from "./persistent-atom";
import { Secret, secretsSchema } from "./types";

export const $secrets = persistentAtom<Secret[]>([], {
  backend: "localStorage",
  key: "app-secrets",
  serialize: (data) => JSON.stringify(secretsSchema.parse(data)),
  deserialize: (raw) => secretsSchema.parse(JSON.parse(raw)),
});
