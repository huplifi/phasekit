import Decimal from 'decimal.js';
import type { Dataset, Refrigerant } from '../../../core/src/contracts';
import { ExactDecimal, parseDecimal } from '../../../core/src/units';

export interface LocalisedText { fi: string; en: string }
export interface RestrictionNotice {
  id: string;
  title: LocalisedText;
  summary: LocalisedText;
  effectiveFrom: string;
  scope: LocalisedText;
  sourceIds: string[];
  sourceUrl: string;
  status: 'active' | 'upcoming';
  caveats: LocalisedText;
}

type RestrictionRule = Omit<RestrictionNotice, 'status'> & {
  appliesTo: 'fgas' | 'ods';
  minimumGwp?: string;
  requiresAnnexI?: boolean;
};

const fgasUrl = 'https://eur-lex.europa.eu/eli/reg/2024/573/oj';
const odsUrl = 'https://eur-lex.europa.eu/eli/reg/2024/590/oj';
const marketCaveats: LocalisedText = {
  fi: 'Koskee vain nimettyä uutta laiteryhmää ja markkinoille saattamista, ei jo käytössä olevan laitteen yleistä käyttökieltoa. Turvallisuuspoikkeukset ja mahdolliset laitekohtaiset EU-poikkeusasetukset on tarkistettava.',
  en: 'Applies only to the named new equipment category and placing on the market, not a general ban on existing equipment. Check safety exceptions and any equipment-specific EU derogations.',
};
const partialOdsBlendNotice: Omit<RestrictionNotice, 'status'> = {
  id: 'ods-component-indicated-composition-unverified', effectiveFrom: '2024-03-11',
  title: { fi: 'Otsoniainetta sisältävä komponentti mahdollinen', en: 'ODS component indicated' },
  summary: { fi: 'Lähteistetty komponenttitieto viittaa EU:n otsoniaineasetuksen liitteen I aineeseen. Seoksen koostumusta ei ole vahvistettu, joten käyttö- ja markkinarajoitusten soveltuvuus on tarkistettava.', en: 'Sourced component data indicates an EU ODS Annex I substance. The blend composition is not verified, so the applicable use and market restrictions need checking.' },
  scope: { fi: 'EU 2024/590, artiklat 4–5; mahdollisesti otsoniainetta sisältävä seos', en: 'EU 2024/590, Articles 4–5; blend with an indicated ODS component' },
  sourceIds: ['eu-2024-590'], sourceUrl: odsUrl,
  caveats: { fi: 'Tämä on tarkistuskehotus, ei vahvistettu seoskoostumus, käyttökelpoisuusarvio eikä lupa aineen käyttöön. Varmista seos, laite ja mahdolliset poikkeukset ennen käyttöä tai huoltoa.', en: 'This is a verification prompt, not a confirmed blend composition, suitability assessment or permission to use the substance. Verify the blend, equipment and any exceptions before use or servicing.' },
};

export const restrictionRules: readonly RestrictionRule[] = [
  {
    id: 'ods-2024-590-art4-5', appliesTo: 'ods', effectiveFrom: '2024-03-11',
    title: { fi: 'Otsoniaineen käyttö- ja markkinarajoitukset', en: 'ODS use and market restrictions' },
    summary: { fi: 'Liitteen I otsoniaineen käyttö sekä sitä sisältävien uusien tuotteiden ja laitteiden markkinoille saattaminen on pääsääntöisesti kielletty.', en: 'Use of an Annex I ozone-depleting substance and placing new products or equipment containing it on the market are generally prohibited.' },
    scope: { fi: 'EU 2024/590, artiklat 4–5; otsoniaine ja sitä sisältävät tuotteet/laitteet', en: 'EU 2024/590, Articles 4–5; ODS and products/equipment containing it' },
    sourceIds: ['eu-2024-590', 'fi-ymparisto'], sourceUrl: odsUrl,
    caveats: { fi: 'Jo käytössä oleva laite voi jäädä käyttöön, mutta vuodon tai rikkoutumisen yhteydessä siihen ei saa lisätä kylmäainetta. Asetuksessa on erityisiä poikkeuksia esimerkiksi raaka-ainekäyttöön; arvioi käyttötapa erikseen.', en: 'Existing equipment may remain in operation, but refrigerant may not be added after a leak or failure. The regulation has specific exceptions, including feedstock uses; assess the use separately.' },
  },
  {
    id: 'fgas-art13-refrigeration-2500', appliesTo: 'fgas', minimumGwp: '2500', effectiveFrom: '2025-01-01',
    title: { fi: 'Korkean GWP:n kylmähuoltorajoitus', en: 'High-GWP refrigeration servicing restriction' },
    summary: { fi: 'GWP vähintään 2 500: tällaisen F-kaasun käyttö kylmälaitteen kunnossapidossa ja huollossa on rajoitettu.', en: 'GWP at least 2,500: use of this F-gas for refrigeration equipment maintenance and servicing is restricted.' },
    scope: { fi: 'EU 2024/573, artikla 13(3); kylmälaitteiden huolto', en: 'EU 2024/573, Article 13(3); refrigeration equipment servicing' },
    sourceIds: ['eu-2024-573', 'fi-ymparisto'], sourceUrl: fgasUrl,
    caveats: { fi: 'Sotilaslaitteet, alle −50 °C tuotteita jäähdyttävät laitteet ja yksittäiset komission poikkeukset on arvioitava. Olemassa oleville laitteille asianmukaisesti merkitty regeneroitu tai rajatusti käytettävä kierrätetty aine on poikkeus 1.1.2030 asti.', en: 'Assess military equipment, product cooling below −50 °C and individual Commission derogations. Properly labelled reclaimed gas or restricted-use recycled gas for existing equipment is excepted until 1 January 2030.' },
  },
  {
    id: 'fgas-art13-ac-heatpump-2500', appliesTo: 'fgas', minimumGwp: '2500', effectiveFrom: '2026-01-01',
    title: { fi: 'Korkean GWP:n ilmastointi- ja lämpöpumppuhuolto', en: 'High-GWP A/C and heat-pump servicing' },
    summary: { fi: 'GWP vähintään 2 500: liitteen I F-kaasun käyttö ilmastointilaitteen tai lämpöpumpun huollossa on rajoitettu.', en: 'GWP at least 2,500: use of this Annex I F-gas to service air-conditioning equipment or heat pumps is restricted.' },
    scope: { fi: 'EU 2024/573, artikla 13(4); ilmastointi ja lämpöpumput', en: 'EU 2024/573, Article 13(4); air conditioning and heat pumps' },
    sourceIds: ['eu-2024-573', 'fi-ymparisto'], sourceUrl: fgasUrl,
    caveats: { fi: 'Olemassa oleville laitteille asianmukaisesti merkitty regeneroitu tai rajatusti käytettävä kierrätetty liitteen I aine on poikkeus 1.1.2032 asti.', en: 'Properly labelled reclaimed or restricted-use recycled Annex I gas for existing equipment is excepted until 1 January 2032.' },
  },
  {
    id: 'fgas-art13-refrigeration-reclaimed-exception-ends', appliesTo: 'fgas', minimumGwp: '2500', requiresAnnexI: true, effectiveFrom: '2030-01-01',
    title: { fi: 'Kylmälaitteen regenerointi- ja kierrätyspoikkeus päättyy', en: 'Refrigeration reclaimed/recycled exception ends' },
    summary: { fi: 'GWP vähintään 2 500: olemassa olevan kylmälaitteen huollossa käytetyn regeneroidun tai kierrätetyn aineen määräaikainen poikkeus päättyy 1.1.2030.', en: 'GWP at least 2,500: the temporary reclaimed/recycled gas exception for servicing existing refrigeration ends on 1 January 2030.' },
    scope: { fi: 'EU 2024/573, artikla 13(3); olemassa olevan kylmälaitteen huolto', en: 'EU 2024/573, Article 13(3); servicing existing refrigeration equipment' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: { fi: 'Ilmoitus koskee vain artiklan 13(3) määräaikaista poikkeusta. Sotilas- ja alle −50 °C sovellukset sekä artiklan 11(5) laitekohtaiset poikkeukset arvioidaan erikseen.', en: 'This notice concerns only the time-limited Article 13(3) exception. Assess military and below −50 °C applications and Article 11(5) equipment-specific derogations separately.' },
  },
  {
    id: 'fgas-art13-ac-hp-reclaimed-exception-ends', appliesTo: 'fgas', minimumGwp: '2500', requiresAnnexI: true, effectiveFrom: '2032-01-01',
    title: { fi: 'Ilmastoinnin ja lämpöpumpun regenerointi- ja kierrätyspoikkeus päättyy', en: 'A/C and heat-pump reclaimed/recycled exception ends' },
    summary: { fi: 'GWP vähintään 2 500: olemassa olevan ilmastointilaitteen tai lämpöpumpun huollossa käytetyn regeneroidun tai kierrätetyn aineen määräaikainen poikkeus päättyy 1.1.2032.', en: 'GWP at least 2,500: the temporary reclaimed/recycled gas exception for servicing existing A/C and heat pumps ends on 1 January 2032.' },
    scope: { fi: 'EU 2024/573, artikla 13(4); olemassa olevan ilmastointilaitteen tai lämpöpumpun huolto', en: 'EU 2024/573, Article 13(4); servicing existing A/C and heat pumps' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: { fi: 'Ilmoitus koskee vain artiklan 13(4) määräaikaista poikkeusta. Mahdolliset komission erilliset poikkeukset on tarkistettava.', en: 'This notice concerns only the time-limited Article 13(4) exception. Check any separate Commission derogations.' },
  },
  {
    id: 'fgas-art13-stationary-refrigeration-750', appliesTo: 'fgas', minimumGwp: '750', effectiveFrom: '2032-01-01',
    title: { fi: 'Kiinteän kylmälaitteen huoltorajoitus', en: 'Stationary refrigeration servicing restriction' },
    summary: { fi: 'GWP vähintään 750: liitteen I F-kaasun käyttö kiinteän kylmälaitteen huollossa rajoittuu 1.1.2032 alkaen.', en: 'GWP at least 750: use of this Annex I F-gas to service stationary refrigeration is restricted from 1 January 2032.' },
    scope: { fi: 'EU 2024/573, artikla 13(5); kiinteä kylmälaite, ei vedenjäähdytin', en: 'EU 2024/573, Article 13(5); stationary refrigeration excluding chillers' },
    sourceIds: ['eu-2024-573', 'fi-ymparisto'], sourceUrl: fgasUrl,
    caveats: { fi: 'Poikkeuksia ovat soveltuvin ehdoin regeneroitu ja rajatusti käytettävä kierrätetty aine olemassa olevaan laitteeseen sekä sotilas-, alle −50 °C ja ydinvoimalasovellukset.', en: 'Subject to conditions, reclaimed and restricted-use recycled gas for existing equipment, military equipment, cooling below −50 °C and nuclear-station cooling are excepted.' },
  },
  {
    id: 'fgas-annex-iv-domestic-2026', appliesTo: 'fgas', effectiveFrom: '2026-01-01',
    title: { fi: 'Uuden kotitalouskylmälaitteen F-kaasurajoitus', en: 'F-gas restriction for new domestic refrigeration' },
    summary: { fi: 'Uusia kotitalouden jääkaappeja ja pakastimia, jotka sisältävät F-kaasua, ei pääsääntöisesti saa saattaa EU-markkinoille.', en: 'New domestic refrigerators and freezers containing F-gas generally cannot be placed on the EU market.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 2(b); uudet kotitalouden jääkaapit/pakastimet', en: 'EU 2024/573, Annex IV point 2(b); new domestic refrigerators/freezers' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-selfcontained-refrigeration-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2025-01-01',
    title: { fi: 'Uuden omavaraisen kylmälaitteen GWP-raja', en: 'GWP limit for new self-contained refrigeration' },
    summary: { fi: 'GWP vähintään 150: uusien omavaraisten kylmälaitteiden markkinoille saattaminen on rajattu.', en: 'GWP at least 150: placing new self-contained refrigeration equipment on the market is restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 4; omavarainen kylmälaite, ei vedenjäähdytin', en: 'EU 2024/573, Annex IV point 4; self-contained refrigeration except chillers' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-other-refrigeration-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2030-01-01',
    title: { fi: 'Uuden muun kylmälaitteen GWP-raja', en: 'GWP limit for other new refrigeration' },
    summary: { fi: 'GWP vähintään 150: uusien muiden kylmälaitteiden markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing other new refrigeration equipment on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 5(c); ei vedenjäähdyttimet eikä kohtien 4 tai 6 laitteet', en: 'EU 2024/573, Annex IV point 5(c); excludes chillers and equipment in points 4 or 6' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-small-chiller-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2027-01-01',
    title: { fi: 'Uuden pienen vedenjäähdyttimen GWP-raja', en: 'GWP limit for new small chillers' },
    summary: { fi: 'GWP vähintään 150: enintään 12 kW vedenjäähdyttimien markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing chillers rated at no more than 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 7(b); vedenjäähdytin enintään 12 kW', en: 'EU 2024/573, Annex IV point 7(b); chiller up to 12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-small-chiller-all', appliesTo: 'fgas', effectiveFrom: '2032-01-01',
    title: { fi: 'Uuden pienen vedenjäähdyttimen F-kaasurajoitus', en: 'F-gas restriction for new small chillers' },
    summary: { fi: 'Enintään 12 kW vedenjäähdyttimien markkinoille saattaminen F-kaasua sisältävinä rajoittuu.', en: 'Placing F-gas-containing chillers rated at no more than 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 7(c); vedenjäähdytin enintään 12 kW', en: 'EU 2024/573, Annex IV point 7(c); chiller up to 12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-large-chiller-750', appliesTo: 'fgas', minimumGwp: '750', effectiveFrom: '2027-01-01',
    title: { fi: 'Uuden suuren vedenjäähdyttimen GWP-raja', en: 'GWP limit for new large chillers' },
    summary: { fi: 'GWP vähintään 750: yli 12 kW vedenjäähdyttimien markkinoille saattaminen rajoittuu.', en: 'GWP at least 750: placing chillers rated above 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 7(d); vedenjäähdytin yli 12 kW', en: 'EU 2024/573, Annex IV point 7(d); chiller above 12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-small-selfcontained-ac-hp-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2027-01-01',
    title: { fi: 'Uuden pienen omavaraisen ilmastointi- tai lämpöpumppulaitteen GWP-raja', en: 'GWP limit for new small self-contained A/C and heat pumps' },
    summary: { fi: 'GWP vähintään 150: enintään 12 kW omavaraisten ilmastointi- ja lämpöpumppulaitteiden markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing self-contained A/C and heat pumps rated at no more than 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 8(b); omavarainen ilmastointi/lämpöpumppu enintään 12 kW', en: 'EU 2024/573, Annex IV point 8(b); self-contained A/C or heat pump up to 12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-small-selfcontained-ac-hp-all', appliesTo: 'fgas', effectiveFrom: '2032-01-01',
    title: { fi: 'Uuden pienen omavaraisen ilmastointi- tai lämpöpumppulaitteen F-kaasurajoitus', en: 'F-gas restriction for new small self-contained A/C and heat pumps' },
    summary: { fi: 'Enintään 12 kW omavaraisten F-kaasua sisältävien ilmastointi- ja lämpöpumppulaitteiden markkinoille saattaminen rajoittuu.', en: 'Placing self-contained F-gas A/C and heat pumps rated at no more than 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 8(c); omavarainen ilmastointi/lämpöpumppu enintään 12 kW', en: 'EU 2024/573, Annex IV point 8(c); self-contained A/C or heat pump up to 12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl,
    caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-mid-selfcontained-ac-hp-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2027-01-01',
    title: { fi: 'Uuden keskikokoisen omavaraisen ilmastointi- tai lämpöpumppulaitteen GWP-raja', en: 'GWP limit for new mid-size self-contained A/C and heat pumps' },
    summary: { fi: 'GWP vähintään 150: yli 12 kW mutta enintään 50 kW omavaraisten laitteiden markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing self-contained equipment above 12 kW and up to 50 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 8(d); omavarainen ilmastointi/lämpöpumppu >12–50 kW', en: 'EU 2024/573, Annex IV point 8(d); self-contained A/C or heat pump >12–50 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-other-selfcontained-ac-hp-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2030-01-01',
    title: { fi: 'Uuden muun omavaraisen ilmastointi- tai lämpöpumppulaitteen GWP-raja', en: 'GWP limit for other new self-contained A/C and heat pumps' },
    summary: { fi: 'GWP vähintään 150: muiden omavaraisten ilmastointi- ja lämpöpumppulaitteiden markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing other self-contained A/C and heat pumps on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 8(e); muut omavaraiset ilmastointi-/lämpöpumppulaitteet', en: 'EU 2024/573, Annex IV point 8(e); other self-contained A/C and heat pumps' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-single-split-under-3kg-750', appliesTo: 'fgas', requiresAnnexI: true, minimumGwp: '750', effectiveFrom: '2025-01-01',
    title: { fi: 'Uuden pienen single-split-laitteen GWP-raja', en: 'GWP limit for new small single-split systems' },
    summary: { fi: 'GWP vähintään 750: uuden single-split-järjestelmän markkinoille saattaminen rajoittuu, kun liitteen I F-kaasua on alle 3 kg.', en: 'GWP at least 750: placing a new single-split system on the market is restricted when it contains less than 3 kg of Annex I F-gas.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 9(a); single-split, liitteen I aineen täytös <3 kg', en: 'EU 2024/573, Annex IV point 9(a); single-split, Annex I gas charge <3 kg' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-split-air-water-12kw-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2027-01-01',
    title: { fi: 'Uuden pienen ilma–vesi-splitin GWP-raja', en: 'GWP limit for new small split air-to-water systems' },
    summary: { fi: 'GWP vähintään 150: enintään 12 kW ilma–vesi-split-järjestelmien markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing split air-to-water systems up to 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 9(b); ilma–vesi-split ≤12 kW', en: 'EU 2024/573, Annex IV point 9(b); split air-to-water ≤12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-split-air-air-12kw-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2029-01-01',
    title: { fi: 'Uuden pienen ilma–ilma-splitin GWP-raja', en: 'GWP limit for new small split air-to-air systems' },
    summary: { fi: 'GWP vähintään 150: enintään 12 kW ilma–ilma-split-järjestelmien markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing split air-to-air systems up to 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 9(c); ilma–ilma-split ≤12 kW', en: 'EU 2024/573, Annex IV point 9(c); split air-to-air ≤12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-split-12kw-all', appliesTo: 'fgas', effectiveFrom: '2035-01-01',
    title: { fi: 'Uuden pienen split-laitteen F-kaasurajoitus', en: 'F-gas restriction for new small split systems' },
    summary: { fi: 'Enintään 12 kW F-kaasua sisältävien split-järjestelmien markkinoille saattaminen rajoittuu.', en: 'Placing split systems up to 12 kW containing F-gas on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 9(d); split ≤12 kW', en: 'EU 2024/573, Annex IV point 9(d); split ≤12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-split-over-12kw-750', appliesTo: 'fgas', minimumGwp: '750', effectiveFrom: '2029-01-01',
    title: { fi: 'Uuden suuren split-laitteen GWP 750 -raja', en: 'GWP 750 limit for new large split systems' },
    summary: { fi: 'GWP vähintään 750: yli 12 kW split-järjestelmien markkinoille saattaminen rajoittuu.', en: 'GWP at least 750: placing split systems above 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 9(e); split >12 kW', en: 'EU 2024/573, Annex IV point 9(e); split >12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
  {
    id: 'fgas-annex-iv-split-over-12kw-150', appliesTo: 'fgas', minimumGwp: '150', effectiveFrom: '2033-01-01',
    title: { fi: 'Uuden suuren split-laitteen GWP 150 -raja', en: 'GWP 150 limit for new large split systems' },
    summary: { fi: 'GWP vähintään 150: yli 12 kW split-järjestelmien markkinoille saattaminen rajoittuu.', en: 'GWP at least 150: placing split systems above 12 kW on the market becomes restricted.' },
    scope: { fi: 'EU 2024/573, liite IV kohta 9(f); split >12 kW', en: 'EU 2024/573, Annex IV point 9(f); split >12 kW' },
    sourceIds: ['eu-2024-573'], sourceUrl: fgasUrl, caveats: marketCaveats,
  },
];

function annexOf(r: Refrigerant): string | null {
  const fact = r.facts.euAnnex;
  return fact?.state === 'verified' && fact.sourceIds.length > 0 && typeof fact.value === 'string' ? fact.value : null;
}

function legalGwp(r: Refrigerant, dataset: Dataset): Decimal | null {
  const direct = r.facts.gwp_eu_2024_573_100yr;
  const acceptedBasis = r.kind === 'blend'
    ? 'EU-2024/573-Annex-VI-mass-weighted'
    : annexOf(r) === 'I'
      ? r.family === 'PFC' ? 'EU-2024/573-Annex-I-AR6' : r.family === 'HFC' ? 'EU-2024/573-Annex-I-AR4' : null
      : annexOf(r) === 'II-1' ? 'EU-2024/573-Annex-II-AR6' : null;
  if (direct?.state === 'verified' && direct.basis === acceptedBasis && direct.sourceIds.length > 0 && direct.value !== null) {
    try { return parseDecimal(String(direct.value)); } catch { return null; }
  }
  if (r.kind !== 'blend' || r.coverage.composition !== 'verified') return null;
  const byId = new Map(dataset.refrigerants.map(item => [item.id, item]));
  if (r.components.length > 100) return null;
  let sumPercent = new ExactDecimal(0);
  let weighted = new ExactDecimal(0);
  for (const part of r.components) {
    const component = byId.get(part.refrigerantId);
    if (!component || part.sourceIds.length === 0 || !['I', 'II-1'].includes(annexOf(component) ?? '')) return null;
    const gwp = legalGwp(component, dataset);
    if (gwp === null) return null;
    try {
      const percent = parseDecimal(part.massPercent);
      if (percent.lte(0)) return null;
      sumPercent = sumPercent.plus(percent);
      weighted = weighted.plus(percent.div(100).mul(gwp));
    } catch { return null; }
  }
  return sumPercent.eq(100) ? weighted : null;
}

function hasAnnexI(r: Refrigerant, dataset: Dataset): boolean {
  if (r.kind === 'pure') return annexOf(r) === 'I';
  const byId = new Map(dataset.refrigerants.map(item => [item.id, item]));
  return r.coverage.composition === 'verified' && r.components.some(part => {
    const component = byId.get(part.refrigerantId);
    return component ? annexOf(component) === 'I' : false;
  });
}

function isFgas(r: Refrigerant, dataset: Dataset): boolean {
  if (r.kind === 'pure') return ['I', 'II-1'].includes(annexOf(r) ?? '');
  const byId = new Map(dataset.refrigerants.map(item => [item.id, item]));
  return r.coverage.composition === 'verified' && r.components.some(part => {
    const component = byId.get(part.refrigerantId);
    return component ? ['I', 'II-1'].includes(annexOf(component) ?? '') : false;
  });
}

function sourcedOdsComponent(r: Refrigerant, dataset: Dataset): string[] {
  if (r.kind !== 'blend') return [];
  const byId = new Map(dataset.refrigerants.map(item => [item.id, item]));
  return [...new Set(r.components.flatMap(part => {
    if (part.sourceIds.length === 0) return [];
    const component = byId.get(part.refrigerantId);
    return component !== undefined && annexOf(component) === 'ODS-I'
      && component.facts.euAnnex.sourceIds.includes('eu-2024-590')
      ? [...part.sourceIds, ...component.facts.euAnnex.sourceIds] : [];
  }))];
}

export function restrictionsFor(r: Refrigerant, dataset: Dataset, asOf: string): RestrictionNotice[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return [];
  const date = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== asOf) return [];
  const odsEvidence = sourcedOdsComponent(r, dataset);
  const odsComponent = odsEvidence.length > 0;
  const ods = (r.kind === 'pure' && annexOf(r) === 'ODS-I')
    || (r.kind === 'blend' && r.coverage.composition === 'verified' && odsComponent);
  const partialOds = r.kind === 'blend' && r.coverage.composition !== 'verified' && odsComponent;
  const fgas = isFgas(r, dataset);
  if (!ods && !partialOds && !fgas) return [];
  const gwp = legalGwp(r, dataset);
  const containsAnnexI = hasAnnexI(r, dataset);
  const notices = restrictionRules
    .filter(rule => {
      if (rule.appliesTo === 'ods') return ods;
      if (!fgas) return false;
      if ((rule.id.startsWith('fgas-art13') || rule.requiresAnnexI) && !containsAnnexI) return false;
      if (rule.minimumGwp && (gwp === null || gwp.lt(rule.minimumGwp))) return false;
      return true;
    })
    .map(({ appliesTo: _appliesTo, minimumGwp: _minimumGwp, requiresAnnexI: _requiresAnnexI, ...notice }) => ({
      ...notice, status: asOf >= notice.effectiveFrom ? 'active' as const : 'upcoming' as const,
    }));
  if (partialOds) notices.unshift({ ...partialOdsBlendNotice, sourceIds: odsEvidence, status: asOf >= partialOdsBlendNotice.effectiveFrom ? 'active' : 'upcoming' });
  return notices;
}
