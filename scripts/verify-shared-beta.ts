/**
 * Synthetic smoke verification for the explicitly authorized beta deployment.
 * Never points at stable production or a caller-provided host. Do not run until
 * beta is deployed. Recovery records are private, ignored local files.
 *
 * Run: node --import tsx scripts/verify-shared-beta.ts
 * Cleanup after interruption:
 *   node --import tsx scripts/verify-shared-beta.ts --cleanup-file <basename>
 */
import assert from "node:assert/strict";
import { mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { emptyData } from "../apps/web/src/storage";
import {
  assetSnapshotSchema,
  buildAssetSnapshot,
} from "../apps/web/src/asset-snapshot";
import {
  createSharedAssetLink,
  sharedAssetLinkSchema,
} from "../apps/web/src/asset-sharing-types";

const ORIGIN = "https://beta.phasekit.app";
const base = new URL(ORIGIN);
assert(
  base.origin === ORIGIN && base.pathname === "/" && !base.search && !base.hash,
);
const root = fileURLToPath(new URL("../", import.meta.url));
const recoveryDirectory = resolve(root, "output/review");
const recoveryName = /^shared-beta-verification-[a-f0-9]{32}\.json$/;
const recoverySchema = z
  .object({
    version: z.literal(1),
    origin: z.literal(ORIGIN),
    createdAt: z.iso.datetime(),
    link: sharedAssetLinkSchema,
    snapshot: assetSnapshotSchema,
    etag: z.string().min(1).max(200).optional(),
    revoked: z.boolean().default(false),
  })
  .superRefine((record, context) => {
    if (
      record.link.origin !== ORIGIN ||
      record.link.assetType !== "site" ||
      record.snapshot.assetType !== "site" ||
      record.link.assetId !== record.snapshot.assetId ||
      record.snapshot.data.sites.length !== 1 ||
      !record.snapshot.data.sites[0].name.startsWith(
        "PhaseKit beta verification ",
      )
    )
      context.addIssue({
        code: "custom",
        message: "Not a synthetic beta verification record",
      });
  });
type Recovery = z.infer<typeof recoverySchema>;

/** fsync before the first request; never print credentials or response bodies. */
async function persist(record: Recovery, path: string) {
  await mkdir(recoveryDirectory, { recursive: true, mode: 0o700 });
  const temporary = `${path}.pending`;
  const file = await open(temporary, "w", 0o600);
  try {
    await file.writeFile(JSON.stringify(record, null, 2));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, path);
}
async function request(
  path: string,
  method: string,
  body?: unknown,
  owner?: string,
) {
  const target = new URL(`/api/shared-assets${path}`, base);
  assert.equal(target.origin, ORIGIN, "Beta origin only");
  return fetch(target, {
    method,
    redirect: "error",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(25_000),
    headers: {
      "Content-Type": "application/json",
      ...(owner ? { Authorization: `Bearer ${owner}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function status(response: Response, expected: number, stage: string) {
  if (response.status !== expected)
    throw new Error(
      `${stage}: expected HTTP ${expected}, received HTTP ${response.status}`,
    );
}
async function receipt(response: Response): Promise<{ etag: string }> {
  return z
    .object({ etag: z.string().min(1).max(200) })
    .parse(await response.json());
}
async function recoverReceipt(record: Recovery, path: string) {
  const response = await request("", "POST", {
    ...record.link,
    snapshot: record.snapshot,
  });
  if (![200, 201].includes(response.status))
    throw new Error(`Cleanup receipt recovery: HTTP ${response.status}`);
  record.etag = (await receipt(response)).etag;
  await persist(record, path);
}
async function revoke(record: Recovery, path: string) {
  // Try the last durable ETag first. DELETE is idempotent after revocation, even
  // if a successful response was lost. A stale ETag is recovered through the
  // same authenticated creation retry; no blind write/delete is attempted.
  if (!record.revoked) {
    if (!record.etag) await recoverReceipt(record, path);
    let response = await request(
      `/${record.link.id}`,
      "DELETE",
      { expectedEtag: record.etag },
      record.link.writeSecret,
    );
    if (response.status === 409) {
      await recoverReceipt(record, path);
      response = await request(
        `/${record.link.id}`,
        "DELETE",
        { expectedEtag: record.etag },
        record.link.writeSecret,
      );
    }
    status(response, 200, "Synthetic share revocation");
    record.revoked = true;
    await persist(record, path);
  }
  status(
    await request(`/${record.link.id}/read`, "POST", {
      readCode: record.link.readCode,
    }),
    403,
    "Read after revocation",
  );
  await unlink(path);
}
async function smoke() {
  const data = emptyData();
  const createdAt = new Date().toISOString();
  const siteId = crypto.randomUUID();
  data.sites = [
    {
      id: siteId,
      name: `PhaseKit beta verification ${createdAt}`,
      address: "Synthetic smoke test only — no customer data",
      updatedAt: createdAt,
    },
  ];
  const link = createSharedAssetLink("site", siteId, ORIGIN);
  const snapshot = buildAssetSnapshot(data, "site", siteId, createdAt);
  const record: Recovery = {
    version: 1,
    origin: ORIGIN,
    createdAt,
    link,
    snapshot,
    revoked: false,
  };
  const path = resolve(
    recoveryDirectory,
    `shared-beta-verification-${link.id}.json`,
  );
  await persist(record, path);
  let testFailure: unknown;
  try {
    const created = await request("", "POST", { ...link, snapshot });
    status(created, 201, "Create");
    record.etag = (await receipt(created)).etag;
    await persist(record, path);
    status(await request(`/${link.id}`, "GET"), 403, "URL-only access");
    status(await request(`/${link.id}`, "HEAD"), 403, "URL-only HEAD access");
    const wrongCode =
      link.readCode === "0000-0000-0000-0000"
        ? "1111-1111-1111-1111"
        : "0000-0000-0000-0000";
    status(
      await request(`/${link.id}/read`, "POST", { readCode: wrongCode }),
      403,
      "Wrong read code",
    );
    const read = await request(`/${link.id}/read`, "POST", {
      readCode: link.readCode,
    });
    status(read, 200, "Code-gated read");
    assert.equal(
      read.headers.get("cache-control"),
      "no-store",
      "Read response must not be cached",
    );
    assert.equal(
      read.headers.get("referrer-policy"),
      "no-referrer",
      "Read response referrer policy",
    );
    assert.equal(
      read.headers.get("x-content-type-options"),
      "nosniff",
      "Read response content-type protection",
    );
    assert(
      !read.headers.has("access-control-allow-origin"),
      "Read response must not enable CORS",
    );
    const content = await read.text();
    assert(
      !content.includes(link.writeSecret),
      "Read response must exclude owner secret",
    );
    assert(
      !content.includes(link.readCode),
      "Read response must exclude read credential",
    );
    const shared = z
      .object({ snapshot: assetSnapshotSchema })
      .parse(JSON.parse(content));
    assert.equal(
      shared.snapshot.data.sites[0].name,
      snapshot.data.sites[0].name,
      "Synthetic site round trip",
    );
    status(
      await request(
        `/${link.id}`,
        "PUT",
        { expectedEtag: record.etag, snapshot },
        link.readCode,
      ),
      403,
      "Read code cannot edit",
    );
    status(
      await request(
        `/${link.id}`,
        "DELETE",
        { expectedEtag: record.etag },
        link.readCode,
      ),
      403,
      "Read code cannot revoke",
    );
    const retry = await request("", "POST", { ...link, snapshot });
    status(retry, 200, "Idempotent creation retry");
    assert.equal(
      (await receipt(retry)).etag,
      record.etag,
      "Creation retry preserves server revision",
    );
    const previousEtag = record.etag;
    const update = structuredClone(snapshot);
    update.data.sites[0].address =
      "Updated synthetic smoke test — no customer data";
    const updated = await request(
      `/${link.id}`,
      "PUT",
      { expectedEtag: previousEtag, snapshot: update },
      link.writeSecret,
    );
    status(updated, 200, "Owner update");
    record.etag = (await receipt(updated)).etag;
    assert.notEqual(
      record.etag,
      previousEtag,
      "Owner update replaces opaque ETag",
    );
    await persist(record, path);
    // Owner-only receipt recovery must not upload the local snapshot or
    // overwrite the newer server snapshot after a lost PUT response.
    const recovered = await request(`/${link.id}/receipt`, "POST", undefined, link.writeSecret);
    status(recovered, 200, "Recover receipt after interrupted update");
    assert.equal((await receipt(recovered)).etag, record.etag);
    status(
      await request(
        `/${link.id}`,
        "PUT",
        { expectedEtag: previousEtag, snapshot },
        link.writeSecret,
      ),
      409,
      "Stale update conflict",
    );
    const reread = await request(`/${link.id}/read`, "POST", {
      readCode: link.readCode,
    });
    status(reread, 200, "Read updated snapshot");
    const latest = z
      .object({ snapshot: assetSnapshotSchema })
      .parse(await reread.json());
    assert.equal(
      latest.snapshot.data.sites[0].address,
      update.data.sites[0].address,
      "Updated snapshot round trip",
    );
  } catch (error) {
    testFailure = error;
  } finally {
    try {
      await revoke(record, path);
    } catch {
      console.error(
        "Cleanup could not be confirmed. Private recovery credentials remain in output/review/shared-beta-verification-*.json; use --cleanup-file with that basename.",
      );
      if (!testFailure)
        testFailure = new Error("Synthetic share cleanup incomplete");
    }
  }
  if (testFailure) throw testFailure;
  console.log(
    "PASS: beta synthetic create/read, URL-only and wrong-code denial, owner separation, idempotency, conditional update/conflict, response headers and confirmed revocation. Local recovery credentials removed.",
  );
}
async function cleanupFile(input: string) {
  assert(
    input === basename(input) && recoveryName.test(input),
    "Use a synthetic verification recovery basename only",
  );
  const path = resolve(recoveryDirectory, input);
  assert.equal(dirname(path), recoveryDirectory);
  const file = await open(path, "r");
  let content: string;
  try {
    content = await file.readFile("utf8");
  } finally {
    await file.close();
  }
  const record = recoverySchema.parse(JSON.parse(content));
  assert.equal(
    input,
    `shared-beta-verification-${record.link.id}.json`,
    "Recovery filename must match synthetic share",
  );
  await revoke(record, path);
  console.log(
    "PASS: synthetic beta verification share revoked and local recovery credentials removed.",
  );
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "Beta only; no request made. Run without arguments after beta deployment. Recovery: --cleanup-file <shared-beta-verification-….json basename in ignored output/review/>.",
    );
    return;
  }
  if (args.length === 2 && args[0] === "--cleanup-file") {
    await cleanupFile(args[1]);
    return;
  }
  assert.equal(
    args.length,
    0,
    "No host argument is accepted; target is beta.phasekit.app only",
  );
  const previous = (await readdir(recoveryDirectory).catch(() => [])).filter(
    (name) => recoveryName.test(name),
  );
  assert.equal(
    previous.length,
    0,
    "A previous synthetic verification needs --cleanup-file first",
  );
  await smoke();
}
try {
  await main();
} catch (error) {
  // Zod/Assertion errors can contain response values; print only our fixed
  // operational error messages, never an arbitrary payload or credential.
  console.error(
    error instanceof Error && error.constructor === Error
      ? `FAIL: ${error.message}`
      : "FAIL: beta verification assertion/validation failed. Inspect the private recovery file locally; credentials were not printed.",
  );
  process.exitCode = 1;
}
