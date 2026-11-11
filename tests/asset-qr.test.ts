import { expect, it } from "vitest";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import {
  parseAssetQr,
  sharedAssetUrl,
  qrPngUrl,
} from "../apps/web/src/asset-qr";
import { createSharedAssetLink } from "../apps/web/src/asset-sharing-types";
it("encodes a decodable black/white QR with permanent URL and no credentials", async () => {
  const link = createSharedAssetLink("site", "site-1", "https://phasekit.example");
  const url = sharedAssetUrl(link.id, "https://phasekit.example");
  expect(url).not.toContain(link.readCode);
  expect(url).not.toContain(link.writeSecret);
  const png = PNG.sync.read(
    Buffer.from((await qrPngUrl(url)).split(",")[1], "base64"),
  );
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(url);
  // Four modules * eight pixels is a full 32px white quiet zone on all sides.
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++)
      if (x < 32 || y < 32 || x >= png.width - 32 || y >= png.height - 32) {
        const offset = (y * png.width + x) * 4;
        expect([...png.data.slice(offset, offset + 4)]).toEqual([
          255, 255, 255, 255,
        ]);
      }
});
it("accepts only this installation’s asset and shared QR routes", () => {
  const origin = "https://phasekit.example";
  expect(parseAssetQr(`${origin}/#/shared/${"f".repeat(32)}`, origin)).toBe(
    `/shared/${"f".repeat(32)}`,
  );
  expect(parseAssetQr(`${origin}/#/assets/equipment/device-1`, origin)).toBe(
    "/assets/equipment/device-1",
  );
  for (const value of [
    "javascript:alert(1)",
    `https://evil.example/#/assets/site/x`,
    `${origin}/#/settings`,
    `${origin}/?secret=x#/assets/site/x`,
    `${origin}/#/shared/${"f".repeat(32)}?code=secret`,
  ])
    expect(parseAssetQr(value, origin)).toBeNull();
});
