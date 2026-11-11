import type { getStore } from "@netlify/blobs";
import { sharedDocumentSchema } from "./shared-assets";
import type { SnapshotStore } from "./shared-assets";

/** Keep SDK overloads at this boundary and validate persisted documents on read. */
export function blobsSnapshotStore(
  store: ReturnType<typeof getStore>,
): SnapshotStore {
  return {
    async getWithMetadata(key, options) {
      const entry = await store.getWithMetadata(key, options);
      if (!entry) return null;
      // An opaque server-issued ETag is essential for safe conditional writes.
      // Fail closed if an emulator/runtime fails to provide one.
      if (!entry.etag) throw new Error("Missing storage revision");
      return { data: sharedDocumentSchema.parse(entry.data), etag: entry.etag };
    },
    setJSON: (key, value, options) => store.setJSON(key, value, options),
  };
}
