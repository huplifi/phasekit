export function savedReportPath(id: string): string {
  return `/saved/${encodeURIComponent(id)}`;
}

export function selectedSavedReportId(hash: string): string {
  const match = /^#\/saved\/(.+)$/.exec(hash);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}
