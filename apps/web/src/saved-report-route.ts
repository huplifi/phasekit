export function savedReportPath(id: string): string {
  return `/reports/${encodeURIComponent(id)}`;
}

export function savedCheckPath(id: string): string {
  return `/reports/check/${encodeURIComponent(id)}`;
}

export function selectedSavedReport(
  hash: string,
): { kind: "tool" | "check"; id: string } | null {
  const match = /^#\/(?:saved|reports)\/(.+)$/.exec(hash);
  if (!match) return null;
  // Recognise the literal route prefix before decoding IDs. A tool ID such as
  // "check/a" remains /reports/check%2Fa and cannot collide with a check route.
  const check = /^check\/([^/]+)$/.exec(match[1]);
  const kind = check ? "check" : "tool";
  try {
    return { kind, id: decodeURIComponent(check ? check[1] : match[1]) };
  } catch {
    return { kind, id: "" };
  }
}

export function selectedSavedReportId(hash: string): string {
  const selected = selectedSavedReport(hash);
  return selected?.kind === "tool" ? selected.id : "";
}
