import { persistentAtom } from "../lib/persistent-atom";

/**
 * A global setting to enable or disable the request history log.
 * Defaults to `true` (enabled).
 */
export const $isHistoryEnabled = persistentAtom<boolean>(true, {
  backend: "localStorage",
  key: "settings-history-enabled",
});
