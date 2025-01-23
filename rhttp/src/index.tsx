import { useLocalStorage } from "@raycast/utils";
import { Collection, Cookies } from "./types";
import { AllRequests } from "./views/all-requests";

function useStore() {
  const collections = useLocalStorage<Collection[]>("collections", []);
  const currentCollectionId = useLocalStorage<Collection["id"]>("currentCollection", undefined);
  const cookies = useLocalStorage<Cookies>("cookies", {});
  return { collections, currentCollectionId, cookies };
}

export type Store = ReturnType<typeof useStore>;

export default function () {
  const store = useStore();
  return <AllRequests store={store} />;
}
