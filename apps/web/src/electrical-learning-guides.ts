import type { MeasurementType } from "./electrical";
import { flukeManualUrl } from "./electrical-meter-guides";

type Copy = { fi: string; en: string };
export interface ElectricalLearningSource {
  label: Copy;
  url: string;
}
export interface ElectricalLearningGuide {
  purpose: Copy;
  preparation: Copy;
  interpretation: Copy;
  sources: ElectricalLearningSource[];
}
const copy = (fi: string, en: string): Copy => ({ fi, en });
const manual = (page: number, pdfPage: number): ElectricalLearningSource => ({
  label: copy(
    `Fluke 1662/1663/1664 FC · käyttöohje, s. ${page}`,
    `Fluke 1662/1663/1664 FC · manual, p. ${page}`,
  ),
  url: `${flukeManualUrl}#page=${pdfPage}`,
});
const installationGuide: ElectricalLearningSource = {
  label: copy(
    "Schneider Electric · tarkastusten tarkoitus",
    "Schneider Electric · purpose of verification",
  ),
  url: "https://www.electrical-installation.org/enwiki/Quality_and_safety_of_an_electrical_installation#Initial_testing_of_an_installation",
};
const conductorGuide: ElectricalLearningSource = {
  label: copy(
    "Metrel · johdinresistanssin ja suojauksen arviointi (koneet)",
    "Metrel · conductor resistance and protection assessment (machines)",
  ),
  url: "https://www.metrel.si/en/solutions/machinessafety/machines-and-fixed-connected-loads-safety/",
};

/**
 * Educational reminders, checked against the linked primary sources.
 * Manufacturer methods do not establish the Finnish installation's limits.
 * No SFS 6000-6 acceptance thresholds are encoded: its full text was unavailable.
 * Keep interpretation separate from readings and the inspector's assessment.
 */
export const electricalLearningGuides: Record<
  MeasurementType,
  ElectricalLearningGuide
> = {
  continuity: {
    purpose: copy(
      "Suojajohtimen tai potentiaalintasausjohtimen yhteyden resistanssi.",
      "Resistance of the protective conductor or bonding connection.",
    ),
    preparation: copy(
      "Varmista jännitteettömyys ja kompensoi mittajohtojen resistanssi.",
      "Prove the circuit dead and compensate for lead resistance.",
    ),
    interpretation: copy(
      "Vertaa johdinreitin pituuden, poikkipinnan ja materiaalin perusteella odotettavaan resistanssiin. Rinnakkaiset yhteydet voivat peittää katkoksen; yhtä yleistä ohmirajaa ei käytetä.",
      "Compare with resistance expected from conductor path, length, cross-section and material. Parallel paths can mask a break; there is no single universal ohm limit.",
    ),
    sources: [manual(29, 33), conductorGuide],
  },
  insulation: {
    purpose: copy(
      "Eristyksen resistanssi mitattavien johtimien välillä tai suhteessa PE-johtimeen.",
      "Insulation resistance between the tested conductors or to PE.",
    ),
    preparation: copy(
      "Jännitteetön piiri. Erota koejännitteelle herkät laitteet valmistajan ohjeen mukaan.",
      "Isolate the circuit. Disconnect voltage-sensitive equipment as its manufacturer instructs.",
    ),
    interpretation: copy(
      "Varmista koejännite ja vähimmäisresistanssi piirin luokituksesta, kytketyistä laitteista ja sovellettavasta standardista. Kirjaa koejännite tuloksen yhteyteen.",
      "Confirm test voltage and minimum resistance from circuit classification, connected equipment and the applicable standard. Record test voltage alongside resistance.",
    ),
    sources: [manual(26, 30), installationGuide],
  },
  "loop-impedance": {
    purpose: copy(
      "Vaiheen ja PE-johtimen välisen vikavirtareitin impedanssi.",
      "Impedance of the earth-fault path between line and PE.",
    ),
    preparation: copy(
      "Jännitteinen mittaus: varmista turvallinen mittausmenetelmä ja vikavirtasuojalle sopiva testitila.",
      "Live test: confirm a safe method and a test mode suitable for any RCD.",
    ),
    interpretation: copy(
      "Vertaa kohteen enimmäisimpedanssiin. Sen määräävät verkkojärjestelmä, suojalaitteen ominaiskäyrä ja vaadittu poiskytkentäaika; huomioi myös mittausolosuhteet.",
      "Compare with the circuit's maximum impedance, determined by earthing system, protective-device curve and required disconnection time. Account for measurement conditions.",
    ),
    sources: [manual(31, 35), installationGuide, conductorGuide],
  },
  "short-circuit-current": {
    purpose: copy(
      "Testerillä arvioitu mahdollinen oikosulkuvirta (PSC); kirjaa myös johdinpari.",
      "Prospective short-circuit current (PSC) estimated by the tester; record the conductor pair too.",
    ),
    preparation: copy(
      "Käytä testerin impedanssimenetelmää käyttöohjeen mukaan. Älä tee oikosulkua.",
      "Use the tester's impedance method as instructed. Never create a short circuit.",
    ),
    interpretation: copy(
      "Vertaa suojalaitteen tyyppiin ja mitoitukseen: virran pitää riittää vaadittuun poiskytkentään, ja suojan katkaisukyvyn on riitettävä mahdolliseen vikavirtaan.",
      "Check the protective device's type and rating: current must support required disconnection, and breaking capacity must cover the prospective fault current.",
    ),
    sources: [manual(36, 40), conductorGuide],
  },
  "rcd-time": {
    purpose: copy(
      "Vikavirtasuojan laukaisuun kuluva aika määrätyllä testivirralla.",
      "Time taken for the RCD to trip at a specified test current.",
    ),
    preparation: copy(
      "Tarkista suojan tyyppi, nimellisvikavirta ja viive. Valitse niitä vastaava aaltomuoto, virtakerroin ja vaihekulma.",
      "Check RCD type, rated residual current and delay. Select matching waveform, current multiplier and phase angle.",
    ),
    interpretation: copy(
      "Vertaa juuri tälle suojalle ja testiasetukselle sallittuun aikaan valmistajan ja sovellettavan standardin mukaan. Kirjaa asetukset; viivästetty suoja arvioidaan eri perustein.",
      "Compare with the time permitted for this device and test setting by its manufacturer and the applicable standard. Record settings; delayed RCDs need different criteria.",
    ),
    sources: [manual(39, 43), manual(85, 89)],
  },
  "rcd-current": {
    purpose: copy(
      "Virta, jolla vikavirtasuoja laukeaa testivirtaa asteittain nostettaessa.",
      "Current at which the RCD trips during a ramp test.",
    ),
    preparation: copy(
      "Tunnista suojatyyppi, nimellisvikavirta ja viive. Valitse oikea aaltomuoto ja vaihekulma.",
      "Identify RCD type, rated residual current and delay. Select the correct waveform and phase angle.",
    ),
    interpretation: copy(
      "Vertaa kyseisen suojan ja aaltomuodon sallittuun laukaisuvirta-alueeseen. Huomioi piirin vuotovirrat; nimellisvikavirta yksin ei määritä kaikkia rajoja.",
      "Compare with the permitted trip-current range for this RCD and waveform. Consider circuit leakage; rated residual current alone does not define every limit.",
    ),
    sources: [manual(47, 51), manual(87, 91)],
  },
  voltage: {
    purpose: copy(
      "Valitun johdinparin välinen jännite.",
      "Voltage between the selected conductor pair.",
    ),
    preparation: copy(
      "Tarkista mittarin ja johtojen soveltuvuus. Kirjaa johdinpari sekä AC/DC.",
      "Check meter and lead suitability. Record conductor pair and AC/DC.",
    ),
    interpretation: copy(
      "Vertaa piirin nimellisjännitteeseen ja laitteen sallittuun syöttöalueeseen. Yksittäinen lukema ei osoita syöttöjännitteen laatua kaikissa käyttötilanteissa.",
      "Compare with circuit nominal voltage and the equipment's permitted supply range. One reading does not establish supply quality under every operating condition.",
    ),
    sources: [manual(25, 29)],
  },
  "phase-sequence": {
    purpose: copy(
      "Kolmivaiheisen piirin vaiheiden järjestys.",
      "Order of phases in a three-phase circuit.",
    ),
    preparation: copy(
      "Varmista mittarin vaihekiertotoiminto ja kytke johdot käyttöohjeen mukaan.",
      "Confirm the meter supports phase rotation and connect as its manual instructs.",
    ),
    interpretation: copy(
      "Vertaa järjestystä suunnitelmaan ja laitteen edellyttämään kiertosuuntaan. Kirjaa järjestys tai mittarin ilmoitus; tämä ei ole jännitearvo.",
      "Compare with the design and the equipment's required rotation. Record the sequence or meter indication; this is not a voltage reading.",
    ),
    sources: [manual(54, 58), installationGuide],
  },
  other: {
    purpose: copy(
      "Nimetty muu mittaus tai laitteen toimintatesti.",
      "A named additional measurement or equipment functional test.",
    ),
    preparation: copy(
      "Määritä testattava toiminto, turvallinen menetelmä ja odotettu toiminta valmistajan ohjeesta tai suunnitelmasta.",
      "Define the function, safe method and expected behaviour from manufacturer instructions or the design.",
    ),
    interpretation: copy(
      "Vertaa havaintoa ennalta määriteltyyn toimintoon tai raja-arvoon. Kirjaa menetelmä, tulos ja käytetty arviointiperuste muistiinpanoon.",
      "Compare the observation with the defined behaviour or limit. Note the method, result and assessment criterion.",
    ),
    sources: [installationGuide],
  },
};
