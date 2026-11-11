import type { ElectricalMeter, MeasurementType } from "./electrical";

export const flukeManualUrl =
  "https://media.fluke.com/75807436-7228-4144-8190-b309010baaca_original%20file.pdf";
export const supportedFlukeModels = ["1662", "1663", "1664 FC"] as const;
type Copy = { fi: string; en: string };
export interface ElectricalMeterGuide {
  marker: string;
  pages: string;
  pdfPage: number;
  steps: Copy[];
}
const copy = (fi: string, en: string): Copy => ({ fi, en });
const guides: Partial<Record<MeasurementType, ElectricalMeterGuide>> = {
  continuity: {
    marker: "RLO",
    pages: "29–30",
    pdfPage: 33,
    steps: [
      copy(
        "Varmista jännitteettömyys. Nollaa mittajohdot.",
        "Verify isolation. Zero the leads.",
      ),
      copy(
        "Valitse testivirta ja napaisuus mittaussuunnitelman mukaan.",
        "Select current and polarity for the test plan.",
      ),
    ],
  },
  insulation: {
    marker: "RISO",
    pages: "26–28",
    pdfPage: 30,
    steps: [
      copy(
        "Varmista jännitteettömyys. Valitse koejännite mittaussuunnitelman mukaan.",
        "Verify isolation. Select test voltage for the test plan.",
      ),
    ],
  },
  "loop-impedance": {
    marker: "ZI",
    pages: "31–38",
    pdfPage: 35,
    steps: [
      copy(
        "Valitse No Trip tai High Current kohteen mukaan. High Current voi laukaista vikavirtasuojan.",
        "Choose No Trip or High Current for the circuit. High Current may trip RCDs.",
      ),
    ],
  },
  "short-circuit-current": {
    marker: "ZI Hi Current",
    pages: "36–38",
    pdfPage: 40,
    steps: [
      copy(
        "Valitse L-N. Kirjaa PSC-näytön arvo. L-PE-tila voi laukaista vikavirtasuojan.",
        "Select L-N. Record the PSC display. L-PE mode may trip RCDs.",
      ),
    ],
  },
  "rcd-time": {
    marker: "ΔT",
    pages: "39–46",
    pdfPage: 43,
    steps: [
      copy(
        "Valitse nimellisvirta, virtakerroin, suojatyyppi ja napaisuus mittaussuunnitelman mukaan.",
        "Select rated current, multiplier, RCD type and polarity for the test plan.",
      ),
    ],
  },
  "rcd-current": {
    marker: "IΔN",
    pages: "47–50",
    pdfPage: 51,
    steps: [
      copy(
        "Valitse nimellisvirta, suojatyyppi ja napaisuus mittaussuunnitelman mukaan.",
        "Select rated current, RCD type and polarity for the test plan.",
      ),
    ],
  },
  voltage: {
    marker: "V",
    pages: "25–26",
    pdfPage: 29,
    steps: [
      copy(
        "Valitse mitattava johdinpari ja tarkista mittajohtojen kunto.",
        "Select the conductor pair and check lead condition.",
      ),
    ],
  },
};
/** Exact model allowlist: family names and unsupported suffixes never imply support. */
export function isSupportedElectricalMeter(meter: ElectricalMeter): boolean {
  return (
    meter.brand.trim().toLowerCase() === "fluke" &&
    supportedFlukeModels.some(
      (model) => model.toUpperCase() === meter.model.trim().toUpperCase(),
    )
  );
}
export function electricalMeterGuide(
  meter: ElectricalMeter,
  type: MeasurementType,
): ElectricalMeterGuide | undefined {
  if (!isSupportedElectricalMeter(meter)) return undefined;
  const model = meter.model.trim().toUpperCase();
  const guide = guides[type];
  if (!guide) return undefined;
  if (type === "insulation" && model === "1664 FC") {
    return {
      ...guide,
      steps: [
        ...guide.steps,
        copy(
          "1664 FC: käytä Safety Pretest -esitestiä käyttöohjeen mukaan.",
          "1664 FC: use Safety Pretest as instructed.",
        ),
      ],
    };
  }
  return guide;
}
