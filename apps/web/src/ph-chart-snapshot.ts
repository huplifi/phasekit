import type { PHCycleResult, PHDiagram } from "../../../packages/core/src/ph";

/** Fixed-order numeric vectors: dome rows are [bar(a), liquid h, vapour h];
 * points are [bar(a), h] for points 1–4. No later dataset lookup is needed. */
export interface PHChartSnapshot {
  kind: "ph-cycle-v1";
  dataVersion: string;
  dome: [number, number, number][];
  points: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
}

export function createCycleChartSnapshot(
  diagram: PHDiagram,
  result: PHCycleResult,
): PHChartSnapshot {
  const point = (label: "1" | "2" | "3" | "4"): [number, number] => [
    Number(result.points[label].pressureBarAbsolute),
    Number(result.points[label].enthalpyKJkg),
  ];
  return {
    kind: "ph-cycle-v1",
    dataVersion: result.dataVersion,
    dome: diagram.dome.map((node) => [
      Number(node.pressureBarAbsolute),
      Number(node.liquidEnthalpyKJkg),
      Number(node.vapourEnthalpyKJkg),
    ]),
    points: [point("1"), point("2"), point("3"), point("4")],
  };
}

/** The cycle view uses only calculated point extents; nearby model curves clip to it. */
export function cycleChartBounds(
  points: readonly (readonly [number, number])[],
) {
  const enthalpies = points.map((point) => point[1]);
  const pressures = points.map((point) => Math.log(point[0]));
  const lowH = Math.min(...enthalpies);
  const highH = Math.max(...enthalpies);
  const lowLogP = Math.min(...pressures);
  const highLogP = Math.max(...pressures);
  const hPad = Math.max((highH - lowH) * 0.09, 5);
  const pPad = Math.max((highLogP - lowLogP) * 0.08, 0.05);
  return {
    xMin: lowH - hPad,
    xMax: highH + hPad,
    pMin: lowLogP - pPad,
    pMax: highLogP + pPad,
  };
}

/** Standalone, print-ready SVG built only from validated frozen vectors. */
export function renderCycleChartSvg(
  snapshot: PHChartSnapshot,
  locale: "fi" | "en",
): string {
  const { points, dome } = snapshot;
  const { xMin, xMax, pMin, pMax } = cycleChartBounds(points);
  const box = {
    left: 74,
    top: 30,
    width: 720,
    height: 420,
    right: 26,
    bottom: 60,
  };
  const width = box.width - box.left - box.right;
  const height = box.height - box.top - box.bottom;
  const x = (h: number) => box.left + ((h - xMin) / (xMax - xMin)) * width;
  const y = (p: number) =>
    box.top + ((pMax - Math.log(p)) / (pMax - pMin)) * height;
  const n = (value: number) => value.toFixed(2);
  const path = (side: 1 | 2) =>
    dome
      .map((row, i) => `${i ? "L" : "M"}${n(x(row[side]))} ${n(y(row[0]))}`)
      .join(" ");
  const hStepRaw = (xMax - xMin) / 6;
  const magnitude = 10 ** Math.floor(Math.log10(hStepRaw));
  const hStep =
    ([1, 2, 5, 10].find((step) => step * magnitude >= hStepRaw) ?? 10) *
    magnitude;
  const hGrid: string[] = [];
  for (let tick = Math.ceil(xMin / hStep); tick * hStep <= xMax; tick++) {
    const value = tick * hStep;
    hGrid.push(
      `<line x1="${n(x(value))}" y1="30" x2="${n(x(value))}" y2="360" stroke="#d8e1e4"/><text x="${n(x(value))}" y="381" text-anchor="middle">${Number(value.toPrecision(8))}</text>`,
    );
  }
  const pGrid: string[] = [];
  for (
    let decade = Math.floor(pMin / Math.LN10);
    decade <= Math.ceil(pMax / Math.LN10);
    decade++
  ) {
    for (const multiplier of [1, 2, 5]) {
      const value = multiplier * 10 ** decade;
      if (Math.log(value) < pMin || Math.log(value) > pMax) continue;
      pGrid.push(
        `<line x1="74" y1="${n(y(value))}" x2="694" y2="${n(y(value))}" stroke="#d8e1e4"/><text x="65" y="${n(y(value) + 4)}" text-anchor="end">${Number(value.toPrecision(3))}</text>`,
      );
    }
  }
  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ] as const;
  const cycle = connections
    .map(
      ([a, b]) =>
        `<line x1="${n(x(points[a][1]))}" y1="${n(y(points[a][0]))}" x2="${n(x(points[b][1]))}" y2="${n(y(points[b][0]))}" stroke="#17313a" stroke-width="2.5"${a === 2 ? ' stroke-dasharray="3 4"' : ""}/>`,
    )
    .join("");
  const pointMarks = points
    .map(
      ([p, h], i) =>
        `<circle cx="${n(x(h))}" cy="${n(y(p))}" r="6" fill="#fff" stroke="#17313a" stroke-width="2.5"/><text x="${n(x(h) + (i >= 2 ? -13 : 12))}" y="${n(y(p) + (i === 0 || i === 3 ? 19 : -11))}" text-anchor="${i >= 2 ? "end" : "start"}" font-size="17" font-weight="700" paint-order="stroke" stroke="#fff" stroke-width="4">${i + 1}</text>`,
    )
    .join("");
  const title =
    locale === "fi"
      ? "Kylmäkierron log(p)–h-kaavio"
      : "Refrigeration cycle log(p)–h diagram";
  const note =
    locale === "fi"
      ? "Rajattu CoolProp HEOS -malli. Kylläisyysrajat avoimia; suorat yhteydet kuvaavat kierron järjestystä, eivät prosessireittiä."
      : "Bounded CoolProp HEOS model. Saturation boundaries are open; straight connections show cycle order, not a process path.";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" width="720" height="420" role="img" aria-label="${title}"><title>${title}</title><desc>${note}</desc><rect width="720" height="420" fill="#fff"/><g fill="#52666c" font-family="system-ui,sans-serif" font-size="13">${hGrid.join("")}${pGrid.join("")}</g><path d="M74 30V360H694" fill="none" stroke="#17313a" stroke-width="1.4"/><defs><clipPath id="ph-cycle-clip"><rect x="74" y="30" width="620" height="330"/></clipPath></defs><g clip-path="url(#ph-cycle-clip)"><path d="${path(1)}" fill="none" stroke="#3c7890" stroke-width="2" stroke-dasharray="6 4"/><path d="${path(2)}" fill="none" stroke="#a56a40" stroke-width="2" stroke-dasharray="6 4"/>${cycle}</g><g fill="#17313a" font-family="system-ui,sans-serif">${pointMarks}<text x="384" y="413" text-anchor="middle" font-size="16">h · kJ/kg</text><text transform="translate(20 195) rotate(-90)" text-anchor="middle" font-size="16">log p · bar(a)</text></g></svg>`;
}
