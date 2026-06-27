import { describe, expect, it } from 'vitest';
import { extractCatalogData, formatJSON, validateCatalogJSON, BUILT_IN_ROLES, CATALOG_TABS } from './catalogData';

describe('catalogData', () => {
  describe('extractCatalogData', () => {
    it('extracts and formats data as string from api response wrapper', () => {
      const payload = { project_id: 'proj-1', data: '{"version":1,"capabilities":[]}' };
      const result = extractCatalogData(payload);
      expect(result).toBe('{\n  "version": 1,\n  "capabilities": []\n}');
    });

    it('formats data when data is an object', () => {
      const payload = { project_id: 'proj-1', data: { version: 1, capabilities: [] } };
      const result = extractCatalogData(payload);
      expect(JSON.parse(result)).toEqual({ version: 1, capabilities: [] });
    });

    it('returns empty string when payload has no data', () => {
      expect(extractCatalogData({ project_id: 'proj-1' })).toBe('');
      expect(extractCatalogData(null)).toBe('');
      expect(extractCatalogData('string')).toBe('');
    });
  });

  describe('formatJSON', () => {
    it('pretty-prints objects', () => {
      const result = formatJSON({ a: 1, b: [2, 3] });
      expect(result).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
    });

    it('pretty-prints JSON strings', () => {
      const result = formatJSON('{"a":1}');
      expect(result).toBe('{\n  "a": 1\n}');
    });

    it('returns the raw value when JSON string is invalid', () => {
      expect(formatJSON('not json')).toBe('not json');
    });

    it('returns empty for null and undefined', () => {
      expect(formatJSON(null)).toBe('');
      expect(formatJSON(undefined as unknown)).toBe('');
    });
  });

  describe('validateCatalogJSON', () => {
    it('accepts valid JSON objects', () => {
      const result = validateCatalogJSON('{"version":1,"roles":[]}');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toEqual({ version: 1, roles: [] });
      }
    });

    it('accepts empty object', () => {
      const result = validateCatalogJSON('{}');
      expect(result.valid).toBe(true);
    });

    it('rejects empty string', () => {
      const result = validateCatalogJSON('');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain('Cannot be empty');
      }
    });

    it('rejects whitespace-only string', () => {
      const result = validateCatalogJSON('   ');
      expect(result.valid).toBe(false);
    });

    it('rejects JSON arrays', () => {
      const result = validateCatalogJSON('[1,2,3]');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain('object');
      }
    });

    it('rejects JSON null', () => {
      const result = validateCatalogJSON('null');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain('object');
      }
    });

    it('rejects invalid JSON syntax', () => {
      const result = validateCatalogJSON('{broken');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CATALOG_TABS', () => {
    it('defines all four catalog types', () => {
      expect(CATALOG_TABS).toHaveLength(4);
      expect(CATALOG_TABS.map((t) => t.kind)).toEqual([
        'capabilities',
        'actionTemplates',
        'assistantRoles',
        'complianceProfile',
      ]);
    });
  });

  describe('BUILT_IN_ROLES', () => {
    it('lists four built-in assistant roles', () => {
      expect(BUILT_IN_ROLES).toHaveLength(4);
      expect(BUILT_IN_ROLES.map((r) => r.role)).toEqual([
        'general',
        'real_estate',
        'insurance',
        'financial',
      ]);
    });

    it('each role has description and instruction', () => {
      for (const role of BUILT_IN_ROLES) {
        expect(role.description).toBeTruthy();
        expect(role.instruction).toBeTruthy();
      }
    });
  });
});
