import { z } from "zod";

export const sharedAssetLinkSchema = z.object({
  assetType: z.enum(["site", "equipment"]),
  assetId: z.string().min(1).max(100),
  origin: z
    .url()
    .refine(
      (value) => /^https?:/.test(value) && new URL(value).origin === value,
      "Use a web origin without a path",
    ),
  id: z.string().regex(/^[a-f0-9]{32}$/),
  readCode: z
    .string()
    .regex(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/),
  writeSecret: z.string().regex(/^[a-f0-9]{64}$/),
  etag: z.string().max(200).optional(),
  publishedAt: z.iso.datetime().optional(),
  publishedFingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
/** Private local state: only id belongs in the QR; readCode is printed beside it. */
export type SharedAssetLink = z.infer<typeof sharedAssetLinkSchema>;
export type AssetType = SharedAssetLink["assetType"];
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function createSharedAssetLink(
  assetType: AssetType,
  assetId: string,
  origin: string,
): SharedAssetLink {
  const hex = (bytes: number) =>
    [...crypto.getRandomValues(new Uint8Array(bytes))]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  const code = [...crypto.getRandomValues(new Uint8Array(16))]
    .map((v) => alphabet[v & 31])
    .join("");
  return {
    assetType,
    assetId,
    origin,
    id: hex(16),
    writeSecret: hex(32),
    readCode: code.match(/.{4}/g)!.join("-"),
  };
}
export function normalizeReadCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}
