/** Runs only against Netlify Dev's local store; never a deployed site. */
import assert from "node:assert/strict";
import { emptyData } from "../apps/web/src/storage";
import { buildAssetSnapshot } from "../apps/web/src/asset-snapshot";
import { createSharedAssetLink } from "../apps/web/src/asset-sharing-types";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:8888");
assert(["127.0.0.1", "localhost"].includes(base.hostname), "Local verification only");
const data = emptyData();
const siteId = crypto.randomUUID();
data.sites = [{ id: siteId, name: "Local verification site", address: "Test only", updatedAt: new Date().toISOString() }];
const link = createSharedAssetLink("site", siteId, base.origin);
const snapshot = buildAssetSnapshot(data, "site", siteId);
const request = (path: string, method: string, body?: unknown, owner?: string) => fetch(new URL(`/api/shared-assets${path}`, base), {
  method,
  headers: { "Content-Type": "application/json", ...(owner ? { Authorization: `Bearer ${owner}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const created = await request("", "POST", { ...link, snapshot });
assert.equal(created.status, 201, `Create: ${await created.clone().text()}`);
const receipt = await created.json() as { etag: string };
assert(receipt.etag);
assert.equal((await request(`/${link.id}`, "GET")).status, 403);
assert.equal((await request(`/${link.id}/read`, "POST", { readCode: "0000-0000-0000-0000" })).status, 403);
const read = await request(`/${link.id}/read`, "POST", { readCode: link.readCode });
assert.equal(read.status, 200);
assert.equal(read.headers.get("cache-control"), "no-store");
const shared = await read.json() as { snapshot: typeof snapshot };
assert.equal(shared.snapshot.data.sites[0].name, "Local verification site");
assert(!JSON.stringify(shared).includes(link.writeSecret), "No owner key in read response");
assert(!JSON.stringify(shared).includes(link.readCode), "No read code in read response");
assert.equal((await request(`/${link.id}`, "PUT", { expectedEtag: receipt.etag, snapshot }, link.readCode)).status, 403);
const retry = await request("", "POST", { ...link, snapshot });
assert.equal(retry.status, 200, "Creation retry must be idempotent");
assert.equal((await retry.json() as { etag: string }).etag, receipt.etag);
snapshot.data.sites[0].name = "Updated local verification site";
const updated = await request(`/${link.id}`, "PUT", { expectedEtag: receipt.etag, snapshot }, link.writeSecret);
assert.equal(updated.status, 200, `Update: ${await updated.clone().text()}`);
const next = await updated.json() as { etag: string };
assert.notEqual(next.etag, receipt.etag);
assert.equal((await request(`/${link.id}`, "PUT", { expectedEtag: receipt.etag, snapshot }, link.writeSecret)).status, 409);
const reread = await request(`/${link.id}/read`, "POST", { readCode: link.readCode });
assert.equal((await reread.json() as { snapshot: typeof snapshot }).snapshot.data.sites[0].name, "Updated local verification site");
assert.equal((await request(`/${link.id}`, "DELETE", { expectedEtag: next.etag }, link.writeSecret)).status, 200);
assert.equal((await request(`/${link.id}/read`, "POST", { readCode: link.readCode })).status, 403);
console.log("PASS: local Netlify create/read/update/conflict/revoke, code gate, owner separation, idempotency and no-store responses");
