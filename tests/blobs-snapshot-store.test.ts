import { expect, it } from "vitest";
import { getStore } from "@netlify/blobs";
import { blobsSnapshotStore } from "../netlify/lib/blobs-snapshot-store";
import { sharedAssetsHandler } from "../netlify/lib/shared-assets";
import { buildAssetSnapshot } from "../apps/web/src/asset-snapshot";
import { createSharedAssetLink } from "../apps/web/src/asset-sharing-types";
import { emptyData } from "../apps/web/src/storage";

/** Real SDK + HTTP response fixture: exercises SDK headers, JSON and ETag semantics. */
it("uses opaque SDK ETags for create/read/conditional update and fails closed when absent", async () => {
  let stored: string | null = null;
  let revision = 0;
  let omitETag = false;
  const writes: Headers[] = [];
  const protocolFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    expect(new URL(request.url).origin).toBe("https://blobs-fixture.invalid");
    const headers = new Headers();
    if (!omitETag) headers.set("etag", `"opaque-${revision}"`);
    if (request.method === "GET")
      return stored === null
        ? new Response(null, { status: 404 })
        : new Response(stored, { headers });
    expect(request.method).toBe("PUT");
    writes.push(request.headers);
    if (
      (request.headers.get("if-none-match") === "*" && stored !== null) ||
      (request.headers.has("if-match") &&
        request.headers.get("if-match") !== `"opaque-${revision}"`)
    )
      return new Response(null, { status: 412 });
    stored = await request.text();
    revision++;
    headers.set("etag", `"opaque-${revision}"`);
    return new Response(null, { headers });
  };
  const store = getStore({
    name: "snapshot-test",
    siteID: "fixture",
    token: "fixture-only",
    edgeURL: "https://blobs-fixture.invalid",
    uncachedEdgeURL: "https://blobs-fixture.invalid",
    consistency: "strong",
    fetch: protocolFetch,
  });
  const adapter = blobsSnapshotStore(store);
  const handler = sharedAssetsHandler(adapter);
  const data = emptyData();
  data.sites = [
    {
      id: "site",
      name: "Site",
      address: "",
      updatedAt: "2026-11-11T00:00:00.000Z",
    },
  ];
  const link = createSharedAssetLink("site", "site", "https://phasekit.example");
  const snapshot = buildAssetSnapshot(data, "site", "site");
  const req = (suffix: string, method: string, body: unknown, owner?: string) =>
    new Request(`https://phasekit.example/api/shared-assets${suffix}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(owner ? { Authorization: `Bearer ${owner}` } : {}),
      },
      body: JSON.stringify(body),
    });
  const create = await handler(req("", "POST", { ...link, snapshot }));
  expect(create.status).toBe(201);
  const receipt = await create.json();
  expect(receipt.etag).toBe('"opaque-1"');
  expect(writes[0].get("if-none-match")).toBe("*");
  expect(
    (
      await handler(
        req(`/${link.id}/read`, "POST", { readCode: link.readCode }),
      )
    ).status,
  ).toBe(200);
  snapshot.data.sites[0].address = "Changed";
  const update = await handler(
    req(
      `/${link.id}`,
      "PUT",
      { expectedEtag: receipt.etag, snapshot },
      link.writeSecret,
    ),
  );
  expect(update.status).toBe(200);
  expect(writes[1].get("if-match")).toBe('"opaque-1"');
  expect((await update.json()).etag).toBe('"opaque-2"');
  expect(
    (
      await handler(
        req(
          `/${link.id}`,
          "PUT",
          { expectedEtag: receipt.etag, snapshot },
          link.writeSecret,
        ),
      )
    ).status,
  ).toBe(409);
  omitETag = true;
  expect(
    (
      await handler(
        req(`/${link.id}/read`, "POST", { readCode: link.readCode }),
      )
    ).status,
  ).toBe(503);
  expect(
    (
      await handler(
        req(
          `/${link.id}`,
          "PUT",
          { expectedEtag: '"opaque-2"', snapshot },
          link.writeSecret,
        ),
      )
    ).status,
  ).toBe(503);
  expect(writes).toHaveLength(2);
});
