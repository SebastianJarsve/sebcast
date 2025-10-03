import { persistentAtom } from "@sebastianjarsve/persistent-atom";
import { createLocalStorageAdapter } from "@sebastianjarsve/persistent-atom/adapters";
import { SortOption } from "~/constants";
import { createCacheAdapter } from "~/lib/adapters";

/**
 * A global setting to enable or disable the request history log.
 * Defaults to `true` (enabled).
 */
export const $isHistoryEnabled = persistentAtom<boolean>(true, {
  storage: createLocalStorageAdapter(),
  key: "settings-history-enabled",
});

/**
 * Sort preferences for collections (session-only).
 */
export const $collectionSortPreferences = persistentAtom<Record<string, SortOption>>(
  {},
  {
    storage: createCacheAdapter("ui-preferences"),
    key: "collection-sort-preferences",
  },
);
