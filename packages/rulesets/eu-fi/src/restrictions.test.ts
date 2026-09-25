import { describe, expect, it } from 'vitest';
import type { Dataset, Fact, Refrigerant } from '../../../core/src/contracts';
import { restrictionsFor } from './restrictions';
import { evaluateCheck } from './index';

const sourced = (value: string, basis?: string): Fact => ({ state: 'verified', value, basis, sourceIds: ['eu-2024-573'] });
const coverage: Refrigerant['coverage'] = { identity: 'verified', composition: 'not_applicable', safety: 'partial', regulatory_eu_fi: 'verified', pt: 'unsupported' };
function pure(id: string, annex: string, gwp?: string, basis = 'EU-2024/573-Annex-I-AR4'): Refrigerant {
  return {
    id, designation: id, name: { fi: id, en: id }, kind: 'pure', family: annex === 'I' ? 'HFC' : '', aliases: [], cas: null, formula: null,
    components: [], facts: { euAnnex: sourced(annex), ...(gwp ? { gwp_eu_2024_573_100yr: sourced(gwp, basis) } : {}) },
    sourceIds: ['eu-2024-573'], coverage,
  };
}
const dataset: Dataset = {
  version: 'fixture', sha256: 'fixture', checkedAt: '2026-09-25', sources: [],
  refrigerants: [
    pure('R134a', 'I', '1430'), pure('R125', 'I', '3500'), pure('R143a', 'I', '4470'),
    pure('R1234yf', 'II-1', '0.501', 'EU-2024/573-Annex-II-AR6'),
    pure('R22', 'ODS-I'), pure('R744', 'none'),
    {
      id: 'R404A', designation: 'R404A', name: { fi: 'R404A', en: 'R404A' }, kind: 'blend', family: '', aliases: [], cas: null, formula: null,
      components: [
        { refrigerantId: 'R125', massPercent: '44', sourceIds: ['ashrae'] },
        { refrigerantId: 'R143a', massPercent: '52', sourceIds: ['ashrae'] },
        { refrigerantId: 'R134a', massPercent: '4', sourceIds: ['ashrae'] },
      ], facts: { euAnnex: sourced('I') }, sourceIds: ['ashrae'], coverage: { ...coverage, composition: 'verified' },
    },
    {
      id: 'R513A', designation: 'R513A', name: { fi: 'R513A', en: 'R513A' }, kind: 'blend', family: '', aliases: [], cas: null, formula: null,
      components: [
        { refrigerantId: 'R1234yf', massPercent: '56', sourceIds: ['ashrae'] },
        { refrigerantId: 'R134a', massPercent: '44', sourceIds: ['ashrae'] },
      ], facts: { euAnnex: sourced('I') }, sourceIds: ['ashrae'], coverage: { ...coverage, composition: 'verified' },
    },
  ],
};
const refrigerant = (id: string) => dataset.refrigerants.find(item => item.id === id)!;

describe('dated contextual restrictions', () => {
  it('warns on source-backed ODS components in partial historical blends without asserting their exact composition', () => {
    const ods = pure('R115', 'ODS-I');
    ods.facts.euAnnex.sourceIds = ['eu-2024-590'];
    const partial: Refrigerant = {
      id: 'R502', designation: 'R502', name: { fi: 'R502', en: 'R502' }, kind: 'blend', family: 'blend', aliases: [], cas: null, formula: null,
      components: [{ refrigerantId: 'R115', massPercent: '51.2', sourceIds: ['coolprop-mit'] }, { refrigerantId: 'R22', massPercent: '48.8', sourceIds: ['coolprop-mit'] }],
      facts: {}, sourceIds: ['coolprop-mit'], coverage: { ...coverage, composition: 'partial', regulatory_eu_fi: 'unsupported' },
    };
    const withBlend = { ...dataset, refrigerants: [...dataset.refrigerants, ods, partial] };
    const partialNotices = restrictionsFor(partial, withBlend, '2026-09-25');
    expect(partialNotices.map(n => n.id)).toEqual(['ods-component-indicated-composition-unverified']);
    expect(partialNotices[0]?.summary.en).toContain('not verified');
    expect(partialNotices[0]?.caveats.en).toContain('not a confirmed blend composition');
    expect(partialNotices[0]?.sourceIds).toEqual(['coolprop-mit', 'eu-2024-590']);
    expect(evaluateCheck({ refrigerantId: 'R502', charge: '5', unit: 'kg', equipment: 'stationary_refrigeration', detection: false, hermetic: false, hermeticLabel: false, residential: false, asOf: '2026-09-25' }, withBlend).state).toBe('insufficient_data');
    partial.coverage.composition = 'verified';
    expect(restrictionsFor(partial, withBlend, '2026-09-25').map(n => n.id)).toEqual(['ods-2024-590-art4-5']);
  });

  it('does not infer an ODS component from unsourced composition or a non-ODS legal source', () => {
    const partial: Refrigerant = {
      id: 'R500', designation: 'R500', name: { fi: 'R500', en: 'R500' }, kind: 'blend', family: 'blend', aliases: [], cas: null, formula: null,
      components: [{ refrigerantId: 'R22', massPercent: '100', sourceIds: [] }], facts: {}, sourceIds: [],
      coverage: { ...coverage, composition: 'partial', regulatory_eu_fi: 'unsupported' },
    };
    const withBlend = { ...dataset, refrigerants: [...dataset.refrigerants, partial] };
    expect(restrictionsFor(partial, withBlend, '2026-09-25')).toEqual([]);
    partial.components[0]!.sourceIds = ['coolprop-mit'];
    expect(restrictionsFor(partial, withBlend, '2026-09-25')).toEqual([]);
    withBlend.refrigerants.find(item => item.id === 'R22')!.facts.euAnnex.sourceIds = ['eu-2024-590'];
    expect(restrictionsFor(partial, withBlend, '2026-09-25').map(n => n.id)).toEqual(['ods-component-indicated-composition-unverified']);
  });
  it('uses PFC Annex I AR6 GWP for contextual market notices', () => {
    const pfc = pure('R218', 'I', '9290', 'EU-2024/573-Annex-I-AR6');
    pfc.family = 'PFC';
    const withPfc = { ...dataset, refrigerants: [...dataset.refrigerants, pfc] };
    expect(restrictionsFor(pfc, withPfc, '2026-09-25').some(n => n.id === 'fgas-art13-refrigeration-2500')).toBe(true);
    pfc.facts.gwp_eu_2024_573_100yr!.basis = 'EU-2024/573-Annex-I-AR4';
    expect(restrictionsFor(pfc, withPfc, '2026-09-25').some(n => n.id === 'fgas-art13-refrigeration-2500')).toBe(false);
  });
  it('distinguishes a future Article 13 rule from active market restrictions', () => {
    const notices = restrictionsFor(refrigerant('R134a'), dataset, '2026-09-25');
    expect(notices.find(n => n.id === 'fgas-art13-stationary-refrigeration-750')?.status).toBe('upcoming');
    expect(notices.find(n => n.id === 'fgas-annex-iv-selfcontained-refrigeration-150')?.status).toBe('active');
    expect(notices.find(n => n.id === 'fgas-art13-refrigeration-2500')).toBeUndefined();
    expect(notices.every(n => n.sourceUrl.startsWith('https://eur-lex.europa.eu/'))).toBe(true);
  });

  it('uses Annex VI component-weighted GWP for mixed HFC/HFO R513A', () => {
    const notices = restrictionsFor(refrigerant('R513A'), dataset, '2026-09-25');
    expect(notices.some(n => n.id === 'fgas-annex-iv-selfcontained-refrigeration-150')).toBe(true);
    expect(notices.some(n => n.id === 'fgas-art13-stationary-refrigeration-750')).toBe(false);
    expect(notices.some(n => n.id === 'fgas-art13-refrigeration-2500')).toBe(false);
  });

  it('shows high-GWP servicing caveats for R404A and changes status by date', () => {
    const now = restrictionsFor(refrigerant('R404A'), dataset, '2026-09-25');
    const future = restrictionsFor(refrigerant('R404A'), dataset, '2032-01-01');
    const article13 = now.find(n => n.id === 'fgas-art13-refrigeration-2500');
    expect(article13?.status).toBe('active');
    expect(article13?.caveats.en).toContain('reclaimed');
    expect(now.find(n => n.id === 'fgas-art13-stationary-refrigeration-750')?.status).toBe('upcoming');
    expect(future.find(n => n.id === 'fgas-art13-stationary-refrigeration-750')?.status).toBe('active');
    expect(now.find(n => n.id === 'fgas-art13-refrigeration-reclaimed-exception-ends')?.status).toBe('upcoming');
    expect(restrictionsFor(refrigerant('R404A'), dataset, '2030-01-01').find(n => n.id === 'fgas-art13-refrigeration-reclaimed-exception-ends')?.status).toBe('active');
    expect(now.find(n => n.id === 'fgas-art13-ac-hp-reclaimed-exception-ends')?.status).toBe('upcoming');
    expect(future.find(n => n.id === 'fgas-art13-ac-hp-reclaimed-exception-ends')?.status).toBe('active');
  });

  it('shows each Annex IV split transition at its own date and threshold', () => {
    const r134a = refrigerant('R134a');
    const r513a = refrigerant('R513A');
    const ids = (r: Refrigerant, date: string) => restrictionsFor(r, dataset, date).map(n => n.id);
    expect(ids(r134a, '2026-09-25')).toContain('fgas-annex-iv-single-split-under-3kg-750');
    expect(restrictionsFor(r513a, dataset, '2026-09-25').find(n => n.id === 'fgas-annex-iv-split-air-water-12kw-150')?.status).toBe('upcoming');
    expect(restrictionsFor(r513a, dataset, '2027-01-01').find(n => n.id === 'fgas-annex-iv-split-air-water-12kw-150')?.status).toBe('active');
    expect(restrictionsFor(r513a, dataset, '2029-01-01').find(n => n.id === 'fgas-annex-iv-split-air-air-12kw-150')?.status).toBe('active');
    expect(restrictionsFor(r513a, dataset, '2033-01-01').find(n => n.id === 'fgas-annex-iv-split-over-12kw-150')?.status).toBe('active');
    expect(restrictionsFor(r513a, dataset, '2035-01-01').find(n => n.id === 'fgas-annex-iv-split-12kw-all')?.status).toBe('active');
    expect(ids(refrigerant('R1234yf'), '2029-01-01')).not.toContain('fgas-annex-iv-split-over-12kw-750');
  });

  it('preserves ODS and natural status without treating R22 as a free natural gas', () => {
    const ods = restrictionsFor(refrigerant('R22'), dataset, '2026-09-25');
    expect(ods.map(n => n.id)).toEqual(['ods-2024-590-art4-5']);
    expect(ods[0]?.caveats.en).toContain('Existing equipment');
    expect(restrictionsFor(refrigerant('R744'), dataset, '2026-09-25')).toEqual([]);
  });

  it('omits GWP-threshold claims when the legal basis is unverified', () => {
    const changed = structuredClone(dataset);
    changed.refrigerants.find(item => item.id === 'R134a')!.facts.gwp_eu_2024_573_100yr!.basis = 'AR5';
    const notices = restrictionsFor(changed.refrigerants.find(item => item.id === 'R134a')!, changed, '2026-09-25');
    expect(notices.every(n => !n.id.includes('150') && !n.id.includes('750') && !n.id.includes('2500'))).toBe(true);
    expect(notices.some(n => n.id === 'fgas-annex-iv-domestic-2026')).toBe(true);
  });

  it('rejects invalid assessment dates', () => {
    expect(restrictionsFor(refrigerant('R134a'), dataset, '2026-02-30')).toEqual([]);
  });
});
