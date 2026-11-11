import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { assetSnapshotSchema } from "../../apps/web/src/asset-snapshot";
import type { AssetSnapshot } from "../../apps/web/src/asset-snapshot";
import { normalizeReadCode } from "../../apps/web/src/asset-sharing-types";

export const sharedDocumentSchema = z.object({
  readHash: z.string().regex(/^[a-f0-9]{64}$/),
  writeHash: z.string().regex(/^[a-f0-9]{64}$/),
  snapshot: assetSnapshotSchema,
  revoked: z.boolean().optional(),
});
export type SharedDocument = z.infer<typeof sharedDocumentSchema>;
export interface SnapshotStore {
  getWithMetadata(
    key: string,
    options: { type: "json" },
  ): Promise<{ data: SharedDocument; etag: string } | null>;
  setJSON(
    key: string,
    value: SharedDocument,
    options:
      | { onlyIfNew: true; onlyIfMatch?: never }
      | { onlyIfMatch: string; onlyIfNew?: never },
  ): Promise<{ modified: boolean; etag?: string }>;
}
const LIMIT = 4_000_000;
const shareId = z.string().regex(/^[a-f0-9]{32}$/);
const readCode = z
  .string()
  .max(40)
  .transform(normalizeReadCode)
  .pipe(z.string().regex(/^[0-9A-HJKMNP-TV-Z]{16}$/));
const writeSecret = z.string().regex(/^[a-f0-9]{64}$/);
const createSchema = z.object({
  id: shareId,
  readCode,
  writeSecret,
  snapshot: assetSnapshotSchema,
});
const updateSchema = z.object({
  expectedEtag: z.string().min(1).max(200),
  snapshot: assetSnapshotSchema,
});
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
function reply(status: number, value: unknown) {
  return new Response(JSON.stringify(value), { status, headers });
}
const receipt = (etag: string | undefined, snapshot: AssetSnapshot) => {
  if (!etag) throw new Error("Missing storage revision");
  return {
    etag,
    publishedAt: snapshot.publishedAt,
    publishedFingerprint: hash(
      JSON.stringify({
        assetType: snapshot.assetType,
        assetId: snapshot.assetId,
        data: snapshot.data,
      }),
    ),
  };
};
const denied = () => reply(403, { error: "Access unavailable" });
function hash(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}
function matches(secret: string, expected: string) {
  const a = Buffer.from(hash(secret), "hex");
  const b = Buffer.from(
    /^[a-f0-9]{64}$/.test(expected) ? expected : "0".repeat(64),
    "hex",
  );
  return timingSafeEqual(a, b);
}
async function boundedJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("invalid");
  if (Number(request.headers.get("content-length")) > LIMIT)
    throw new Error("large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    bytes += result.value.byteLength;
    if (bytes > LIMIT) {
      await reader.cancel();
      throw new Error("large");
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}
/** One object per asset, immutable credentials, conditional whole-snapshot replacement. */
export function sharedAssetsHandler(store: SnapshotStore) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== url.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return denied();
    const route = url.pathname.match(
      /^\/api\/shared-assets(?:\/([a-f0-9]{32})(\/read)?)?$/,
    );
    if (!route || url.search) return denied();
    const [, id, read] = route;
    // URL alone and GET never disclose even whether the object exists.
    if (
      request.method === "GET" ||
      request.method === "HEAD" ||
      request.method === "OPTIONS"
    )
      return denied();
    try {
      if (!id && request.method === "POST") {
        const body = createSchema.parse(await boundedJson(request));
        const snapshot = body.snapshot;
        const document: SharedDocument = {
          readHash: hash(body.readCode),
          writeHash: hash(body.writeSecret),
          snapshot,
        };
        const result = await store.setJSON(body.id, document, {
          onlyIfNew: true,
        });
        if (result.modified) return reply(201, receipt(result.etag, snapshot));
        // Retry after a lost response returns the stored receipt; never overwrites.
        const existing = await store.getWithMetadata(body.id, { type: "json" });
        if (
          existing &&
          !existing.data.revoked &&
          matches(body.writeSecret, existing.data.writeHash) &&
          matches(body.readCode, existing.data.readHash)
        )
          return reply(200, receipt(existing.etag, existing.data.snapshot));
        return denied();
      }
      if (!id) return denied();
      if (read && request.method === "POST") {
        const parsed = z
          .object({ readCode })
          .safeParse(await boundedJson(request));
        if (!parsed.success) return denied();
        const entry = await store.getWithMetadata(id, { type: "json" });
        // Always perform a constant-time hash comparison, including missing IDs.
        const valid = matches(
          parsed.data.readCode,
          entry?.data.readHash ?? "0".repeat(64),
        );
        if (!entry || entry.data.revoked || !valid) return denied();
        return reply(200, { snapshot: entry.data.snapshot });
      }
      if (read || !["PUT", "DELETE"].includes(request.method)) return denied();
      const secret =
        request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
      if (!writeSecret.safeParse(secret).success) return denied();
      const entry = await store.getWithMetadata(id, { type: "json" });
      const valid = matches(secret, entry?.data.writeHash ?? "0".repeat(64));
      if (!entry || !valid) return denied();
      if (entry.data.revoked)
        return request.method === "DELETE"
          ? reply(200, { revoked: true })
          : denied();
      const body = await boundedJson(request);
      if (request.method === "DELETE") {
        const parsed = z
          .object({ expectedEtag: z.string().min(1).max(200) })
          .parse(body);
        if (parsed.expectedEtag !== entry.etag)
          return reply(409, { error: "Snapshot changed" });
        const result = await store.setJSON(
          id,
          { ...entry.data, revoked: true },
          { onlyIfMatch: parsed.expectedEtag },
        );
        return result.modified
          ? reply(200, { revoked: true })
          : reply(409, { error: "Snapshot changed" });
      }
      const parsed = updateSchema.parse(body);
      if (
        parsed.expectedEtag !== entry.etag ||
        parsed.snapshot.assetType !== entry.data.snapshot.assetType ||
        parsed.snapshot.assetId !== entry.data.snapshot.assetId
      )
        return reply(409, { error: "Snapshot changed" });
      const result = await store.setJSON(
        id,
        { ...entry.data, snapshot: parsed.snapshot },
        { onlyIfMatch: parsed.expectedEtag },
      );
      return result.modified
        ? reply(200, receipt(result.etag, parsed.snapshot))
        : reply(409, { error: "Snapshot changed" });
    } catch (error) {
      if (error instanceof Error && error.message === "large")
        return reply(413, { error: "Document too large" });
      if (
        error instanceof z.ZodError ||
        error instanceof SyntaxError ||
        (error instanceof Error && error.message === "invalid")
      )
        return reply(400, { error: "Invalid document" });
      // Do not log request bodies, Authorization, credentials or stored content.
      return reply(503, { error: "Storage unavailable" });
    }
  };
}
