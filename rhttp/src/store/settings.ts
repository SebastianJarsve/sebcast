import { persistentAtom } from "@sebastianjarsve/persistent-atom";
import { createLocalStorageAdapter } from "@sebastianjarsve/persistent-atom/adapters";

/**
 * A global setting to enable or disable the request history log.
 * Defaults to `true` (enabled).
 */
export const $isHistoryEnabled = persistentAtom<boolean>(true, {
  storage: createLocalStorageAdapter(),
  key: "settings-history-enabled",
});
