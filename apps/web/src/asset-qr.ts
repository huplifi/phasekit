import QRCode from "qrcode";
import type { AssetType } from "./asset-sharing-types";

export function assetPath(type: AssetType, id: string): string {
  return `/assets/${type}/${encodeURIComponent(id)}`;
}
export function sharedAssetUrl(
  id: string,
  origin = window.location.origin,
): string {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("Invalid link");
  const url = new URL(origin);
  if (!/^https?:$/.test(url.protocol))
    throw new Error("Sharing requires a web address");
  return `${url.origin}/#/shared/${id}`;
}
/** A scanner can only navigate to a recognized route on this installation. */
export function parseAssetQr(value: string, origin: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== origin || url.pathname !== "/" || url.search)
      return null;
    const route = url.hash.slice(1);
    if (/^\/shared\/[a-f0-9]{32}$/.test(route)) return route;
    if (/^\/assets\/(site|equipment)\/[^/?#]+$/.test(route)) return route;
    return null;
  } catch {
    return null;
  }
}
export function qrOptions() {
  return {
    errorCorrectionLevel: "M" as const,
    margin: 4,
    scale: 8,
    color: { dark: "#000000", light: "#ffffff" },
  };
}
export async function qrPngUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, qrOptions());
}
/** Both downloads and print use this exact label canvas, including the same QR payload. */
export async function createQrLabel(
  payload: string,
  title: string,
  identifier: string,
  readCode?: string,
  fi = true,
): Promise<HTMLCanvasElement> {
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, payload, qrOptions());
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(qr.width, 640);
  canvas.height = qr.height + (readCode ? 280 : 200);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(qr, Math.floor((canvas.width - qr.width) / 2), 0);
  context.fillStyle = "#000000";
  context.textAlign = "center";
  const lines = (
    text: string,
    font: string,
    startY: number,
    lineHeight: number,
    maxLines: number,
  ) => {
    context.font = font;
    const chunks: string[] = [];
    let line = "";
    for (const char of text) {
      if (context.measureText(line + char).width > canvas.width - 48) {
        chunks.push(line);
        line = "";
      }
      line += char;
    }
    if (line) chunks.push(line);
    const visible = chunks.slice(0, maxLines);
    if (chunks.length > maxLines)
      visible[maxLines - 1] = visible[maxLines - 1].slice(0, -2) + "…";
    visible.forEach((value, index) =>
      context.fillText(value, canvas.width / 2, startY + index * lineHeight),
    );
  };
  lines(title, "bold 24px sans-serif", qr.height + 30, 30, 3);
  lines(identifier, "18px sans-serif", qr.height + 126, 24, 2);
  if (readCode) {
    context.font = "18px sans-serif";
    context.fillText(
      fi ? "Lukukoodi" : "Read code",
      canvas.width / 2,
      qr.height + 186,
    );
    context.font = "bold 25px monospace";
    context.fillText(readCode, canvas.width / 2, qr.height + 222);
  }
  context.font = "16px sans-serif";
  context.fillText("PhaseKit", canvas.width / 2, canvas.height - 18);
  return canvas;
}
