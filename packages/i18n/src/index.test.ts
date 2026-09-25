import {expect,it} from 'vitest';
import {fi,en,formatDecimal,formatNumber,translate} from './index';
it('has matching FI/EN ICU message coverage',()=>{expect(Object.keys(fi).sort()).toEqual(Object.keys(en).sort());expect(translate('fi','results',{count:2})).toBe('2 kylmäainetta');});
it('never rounds just-below legal quantities into the threshold',()=>{expect(formatDecimal('4.999999999999999999999999999999','en')).toBe('4.999999999999999999999999999999');expect(formatDecimal('4.999999999999999999999999999999','fi')).toBe('4,999999999999999999999999999999');});
it('preserves tiny nonzero values and large exact integers',()=>{expect(formatNumber(1e-8,'fi')).not.toBe('0');expect(formatDecimal('100000000000000000000.01','en')).toBe('100,000,000,000,000,000,000.01');expect(formatDecimal('-0.00001','fi')).toBe('−0,00001');});
