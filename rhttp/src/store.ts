import { atom, ReadableAtom } from "nanostores";
import { PersistentAtom, persistentAtom } from "./persistent-atom";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Collection, collectionSchema, Cookies, NewCollection, NewRequest, Request, requestSchema } from "./types";
import { computed } from "nanostores";
import { randomUUID } from "crypto";

export const $collections = persistentAtom<Collection[]>([], {
  backend: "file",
  fileName: "collections.json",
  // serialize: (data) => JSON.stringify(z.array(collectionSchema).parse(data)),
  serialize: JSON.stringify,
  deserialize: (raw) => z.array(collectionSchema).parse(JSON.parse(raw)),
});

/**
 * Checks if collections are empty after hydration and creates a default one if needed.
 */
async function initializeDefaultCollection() {
  await $collections.ready; // Wait for the store to be loaded
  const collections = $collections.get();

  // If the store is empty, it's the user's first time running the extension.
  if (collections.length === 0) {
    console.log("No collections found, creating default collection...");
    const defaultCollection: Collection = {
      id: randomUUID(),
      title: "default",
      requests: [],
      headers: [],
    };

    // Add the new collection to the store and select it.
    $collections.set([defaultCollection]);
    $currentCollectionId.set(defaultCollection.id);
  }
}

initializeDefaultCollection();

export const $currentCollectionId = persistentAtom<string | null>(null, {
  backend: "localStorage",
  key: "currentCollectionId",
  isEqual(a, b) {
    return a === b;
  },
});

export const $currentCollection = computed([$currentCollectionId, $collections], (id, allCollections) => {
  if (!id) return null;
  return allCollections.find((c) => c.id === id) ?? null;
});

export const $selectedRequestId = atom<string | null>(null);

export const $cookies = persistentAtom<Cookies | null>(null, {
  backend: "file",
  fileName: "cookies.json",
});

// function useStore() {
//   const collections = useLocalStorage<Collection[]>("collections", []);
//   const currentCollectionId = useLocalStorage<Collection["id"]>("currentCollection", undefined);
//   const cookies = useLocalStorage<Cookies>("cookies", {});
//   return { collections, currentCollectionId, cookies };
// }

// export type Store = ReturnType<typeof useStore>;

/**
 * A type guard to check if an atom is a PersistentAtom.
 * It now accepts any ReadableAtom.
 */
function isPersistentAtom<T>(atom: ReadableAtom<T>): atom is PersistentAtom<T> {
  // The check remains the same: we just look for the .ready promise.
  return "ready" in atom;
}

/**
 * A smart hook that subscribes to any atom (writable or computed)
 * and automatically handles hydration for persistent atoms.
 *
 * @param atom The Nanostores atom to use.
 * @returns An object with the atom's `value` and its `isHydrated` status.
 */
export function useAtom<T>(atom: ReadableAtom<T>) {
  const value = useStore(atom);
  const [isHydrated, setIsHydrated] = useState(!isPersistentAtom(atom));

  useEffect(() => {
    if (isPersistentAtom(atom)) {
      atom.ready.then(() => {
        // We can set the state directly once the promise resolves.
        setIsHydrated(true);
      });
    }
  }, [atom]);

  return { value, isHydrated };
}

// --- ACTIONS ---

/**
 * Creates a new collection and adds it to the store.
 */
export async function createCollection(data: NewCollection) {
  const newCollection: Collection = {
    ...data,
    requests: [],
    id: randomUUID(),
  };

  const newState = [...$collections.get(), newCollection];

  // Validation
  z.array(collectionSchema).parse(newState);
  await $collections.setAndFlush(newState);
}

/**
 * Updates an existing collection in the store.
 */
export async function updateCollection(collectionId: string, data: Partial<Collection>) {
  const updatedCollections = $collections.get().map((c) => {
    if (c.id === collectionId) {
      // Merge the existing collection with the new data
      return { ...c, ...data };
    }
    return c;
  });

  // Validation
  z.array(collectionSchema).parse(updatedCollections);
  await $collections.setAndFlush(updatedCollections);
}

/**
 * Creates a new request and adds it to the specified collection.
 */
export async function createRequest(collectionId: string, data: NewRequest) {
  const newRequest: Request = {
    ...data,
    id: randomUUID(),
  };

  const updatedCollections = $collections.get().map((c) => {
    if (c.id === collectionId) {
      return { ...c, requests: [...c.requests, newRequest] };
    }
    return c;
  });

  // Validation
  z.array(collectionSchema).parse(updatedCollections);
  await $collections.setAndFlush(updatedCollections);
}

/**
 * Updates an existing request within a specific collection.
 */
export async function updateRequest(collectionId: string, requestId: string, data: Partial<Request>) {
  const updatedCollections = $collections.get().map((c) => {
    if (c.id === collectionId) {
      const updatedRequests = c.requests.map((r) => {
        if (r.id === requestId) {
          return { ...r, ...data };
        }
        return r;
      });
      return { ...c, requests: updatedRequests };
    }
    return c;
  });

  z.array(collectionSchema).parse(updatedCollections);
  await $collections.setAndFlush(updatedCollections);
}
