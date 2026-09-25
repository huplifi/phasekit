import raw from "../generated/dataset.json";
import type { Dataset, Refrigerant } from "../../core/src/contracts";
export const dataset = raw as Dataset;
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function searchInDataset(
  data: Dataset,
  query: string,
): { refrigerant: Refrigerant; match: "exact" | "suggested" }[] {
  const q = normalizeSearch(query);
  if (!q)
    return data.refrigerants.map((refrigerant) => ({
      refrigerant,
      match: "exact",
    }));
  const scores = new Map<string, number>();
  const results = data.refrigerants.flatMap<{
    refrigerant: Refrigerant;
    match: "exact" | "suggested";
  }>((refrigerant) => {
    const terms = [
      refrigerant.id,
      refrigerant.designation,
      refrigerant.cas ?? "",
      refrigerant.name.fi,
      refrigerant.name.en,
      ...refrigerant.aliases,
    ].map(normalizeSearch);
    const numberTerm = normalizeSearch(refrigerant.designation).replace(
      /^r/,
      "",
    );
    const exact = terms.includes(q) || numberTerm === q;
    const score = exact
      ? 0
      : numberTerm.startsWith(q) ||
          normalizeSearch(refrigerant.designation).startsWith(q)
        ? 1
        : terms.some((t) => t.includes(q))
          ? 2
          : 3;
    scores.set(refrigerant.id, score);
    if (exact) return [{ refrigerant, match: "exact" as const }];
    if (
      terms.some((t) => t.includes(q)) ||
      terms.some((t) => q.length >= 3 && distance(q, t) <= 1)
    )
      return [{ refrigerant, match: "suggested" as const }];
    return [];
  });
  return results.sort(
    (a, b) =>
      scores.get(a.refrigerant.id)! - scores.get(b.refrigerant.id)! ||
      a.refrigerant.designation.localeCompare(b.refrigerant.designation, "en", {
        numeric: true,
      }),
  );
}
export const searchRefrigerants = (query: string) =>
  searchInDataset(dataset, query);
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(
        row[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
    previous = row;
  }
  return previous[b.length];
}
