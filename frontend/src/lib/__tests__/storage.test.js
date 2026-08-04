import { describe, it, expect } from 'vitest';
import { parseImportedState } from '../storage';
import { buildTestData } from '../../data/testData';

describe('parseImportedState', () => {
  it('acepta un JSON exportado previamente (round-trip)', () => {
    const data = buildTestData();
    const json = JSON.stringify(data);
    const parsed = parseImportedState(json);
    expect(parsed.assets.length).toBe(data.assets.length);
    expect(parsed.entries.length).toBe(data.entries.length);
  });

  it('rechaza un JSON sin la forma esperada', () => {
    expect(() => parseImportedState(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('rechaza JSON malformado', () => {
    expect(() => parseImportedState('{not valid json')).toThrow();
  });
});
