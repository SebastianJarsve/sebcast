import { atom, ReadableAtom } from "nanostores";
import { PersistentAtom, persistentAtom } from "../lib/persistent-atom";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Collection, collectionSchema, NewCollection, NewRequest, Request } from "../types";
import { computed } from "nanostores";
import { randomUUID } from "crypto";

export const $collections = persistentAtom<Collection[]>([], {
  backend: "file",
  fileName: "collections.json",
  serialize: JSON.stringify,
  deserialize: (raw) => z.array(collectionSchema).parse(JSON.parse(raw)),
});

// --- A helper to create the default collection object ---
function createDefaultCollectionObject(): Collection {
  const newId = randomUUID();
  return {
    id: newId,
    title: "default",
    requests: [],
    headers: [],
  };
}

/**
 * Checks if collections are empty on startup and creates a default one if needed.
 */
export async function initializeDefaultCollection() {
  await $collections.ready;
  if ($collections.get().length === 0) {
    const defaultCollection = createDefaultCollectionObject();
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
 * Deletes a collection, and if it's the last one, creates a new default collection.
 */
export async function deleteCollection(collectionId: string) {
  const newState = $collections.get().filter((c) => c.id !== collectionId);

  if (newState.length === 0) {
    // If we just deleted the last collection, create a new default one.
    const defaultCollection = createDefaultCollectionObject();
    newState.push(defaultCollection);
    // And make sure to select it
    $currentCollectionId.set(defaultCollection.id);
  } else {
    // If other collections remain, and the deleted one was selected, clear the selection.
    if ($currentCollectionId.get() === collectionId) {
      $currentCollectionId.set(null);
    }
  }

  // No need to validate here, as we are only removing/replacing data
  await $collections.setAndFlush(newState);
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
  return newRequest;
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

/**
 * Deletes a request from a specific collection.
 */
export async function deleteRequest(collectionId: string, requestId: string) {
  const newState = $collections.get().map((c) => {
    if (c.id === collectionId) {
      // Filter out the request with the matching ID
      const updatedRequests = c.requests.filter((r) => r.id !== requestId);
      return { ...c, requests: updatedRequests };
    }
    return c;
  });

  // No need to validate here, as we are only removing data
  await $collections.setAndFlush(newState);
}
