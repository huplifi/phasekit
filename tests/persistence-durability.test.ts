import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../apps/web/src/storage';
import {
  createDurableWriter, emptyData, loadData, parseBackup, saveData,
  snapshotDesignation,
} from '../apps/web/src/storage';

function sampleSnapshot(): Snapshot {
  return {
    id: 'snapshot-1', createdAt: '2026-09-25T10:00:00.000Z',
    refrigerant: {
      id: 'r513a', designation: 'R513A', name: { fi: 'R513A', en: 'R513A' },
      kind: 'blend', family: 'HFC/HFO', aliases: [], cas: null, formula: null,
      components: [{ refrigerantId: 'r134a', massPercent: '44', sourceIds: ['epa'] }],
      facts: { euAnnex: { state: 'verified', value: 'I', sourceIds: ['eu-2024-573'] } },
      sourceIds: ['epa'],
      coverage: { identity: 'verified', composition: 'partial', safety: 'partial', regulatory_eu_fi: 'partial', pt: 'unsupported' },
    },
    result: {
      state: 'required', months: 6, decisiveRule: 'fgas-II-10', decisiveComponent: 'r1234yf',
      components: [{ refrigerantId: 'r134a', massPercent: '44', massKg: '22', annex: 'I', gwp: '1430', gwpBasis: 'EU-2024/573-Annex-I-AR4', tonnesCO2e: '31.46' }],
      obligations: [], reasonCodes: ['FGAS_ANNEX_II_1_PERIODIC_CHECK'], requiredInputs: [],
      rulesetVersion: 'rules-1', dataVersion: 'data-1', sourceIds: ['eu-2024-573'],
      detectionRequired: false,
      input: { refrigerantId: 'r513a', charge: '50', unit: 'kg', equipment: 'stationary_refrigeration', detection: false, hermetic: false, hermeticLabel: false, residential: false, asOf: '2026-09-25' },
    },
    sources: [],
    componentDesignations: { r134a: 'R134a', r1234yf: 'R1234yf' },
  };
}

describe('durable snapshot storage', () => {
  it('waits for the durable write and does not report a failed write as flushed', async () => {
    let fail = true;
    const committed: number[] = [];
    const writer = createDurableWriter(async (value: number) => {
      if (fail) throw new Error('quota exceeded');
      committed.push(value);
    });
    await expect(writer.enqueue(1)).rejects.toThrow('quota exceeded');
    await expect(writer.flush()).rejects.toThrow('quota exceeded');
    fail = false;
    await writer.enqueue(2);
    await writer.flush();
    expect(committed).toEqual([2]);
  });

  it('persists frozen component names and accepts older v1 backups without them', async () => {
    const current = { ...emptyData(), snapshots: [sampleSnapshot()] };
    await saveData(current);
    const loaded = await loadData();
    expect(snapshotDesignation(loaded.snapshots[0]!, 'r134a')).toBe('R134a');
    expect(loaded.snapshots[0]?.result.dataVersion).toBe('data-1');

    const legacy = structuredClone(current);
    delete legacy.snapshots[0]!.componentDesignations;
    const imported = parseBackup(JSON.stringify(legacy));
    expect(snapshotDesignation(imported.snapshots[0]!, 'r134a')).toBe('r134a');
    expect(snapshotDesignation(imported.snapshots[0]!, 'r513a')).toBe('R513A');
  });
});
