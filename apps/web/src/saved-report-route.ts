export function savedReportPath(id: string): string {
  return `/reports/${encodeURIComponent(id)}`;
}

export function selectedSavedReportId(hash: string): string {
  const match = /^#\/(?:saved|reports)\/(.+)$/.exec(hash);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}
