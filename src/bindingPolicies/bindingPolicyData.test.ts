import { describe, expect, it } from 'vitest';
import {
  parseBindingPolicyList,
  parseBindingPolicyDetail,
  parseBindingPolicy,
  validateBindingRulesJSON,
  formatBindingRules,
  defaultBindingRulesJSON,
  summarizeBindingRules,
} from './bindingPolicyData';

describe('parseBindingPolicyList', () => {
  it('extracts binding policies from items array', () => {
    const payload = {
      items: [
        {
          policy_id: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
          enabled: true,
          priority: 10,
          slug: 'bind.company_email',
          external_key: 'bind-company-email-v1',
          rules: [{ l: 'and', c: [{ a: 'external.email', v: 'ends_with:@company.com' }] }],
          created_at: 1760000000000,
          updated_at: 1760000000000,
        },
      ],
    };

    const result = parseBindingPolicyList(payload);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      policyId: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
      enabled: true,
      priority: 10,
      slug: 'bind.company_email',
      externalKey: 'bind-company-email-v1',
      rules: [{ l: 'and', c: [{ a: 'external.email', v: 'ends_with:@company.com' }] }],
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    });
  });

  it('returns empty array when items is missing', () => {
    expect(parseBindingPolicyList({})).toEqual([]);
  });

  it('returns empty array when payload is not an object', () => {
    expect(parseBindingPolicyList(null)).toEqual([]);
  });
});

describe('parseBindingPolicy', () => {
  it('fills defaults for missing fields', () => {
    const result = parseBindingPolicy({});
    expect(result).toEqual({
      policyId: '',
      enabled: false,
      priority: 0,
      slug: '',
      externalKey: '',
      rules: null,
      createdAt: 0,
      updatedAt: 0,
    });
  });
});

describe('parseBindingPolicyDetail', () => {
  it('extracts binding policy from data.binding_policy wrapper', () => {
    const payload = {
      data: {
        binding_policy: {
          policy_id: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
          enabled: true,
          priority: 10,
          slug: 'bind.company_email',
          external_key: 'bind-company-email-v1',
          rules: [{ l: 'and', c: [] }],
          created_at: 1760000000000,
          updated_at: 1760000000000,
        },
      },
    };

    const result = parseBindingPolicyDetail(payload);

    expect(result.policyId).toBe('0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08');
    expect(result.enabled).toBe(true);
    expect(result.priority).toBe(10);
    expect(result.slug).toBe('bind.company_email');
    expect(result.rules).toEqual([{ l: 'and', c: [] }]);
  });

  it('returns defaults when data is missing', () => {
    const result = parseBindingPolicyDetail({});
    expect(result.policyId).toBe('');
  });
});

describe('validateBindingRulesJSON', () => {
  it('accepts valid JSON array', () => {
    const result = validateBindingRulesJSON('[1, 2, 3]');
    expect(result.valid).toBe(true);
  });

  it('accepts valid JSON object', () => {
    const result = validateBindingRulesJSON('{ "l": "and" }');
    expect(result.valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateBindingRulesJSON('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('empty');
    }
  });

  it('rejects null literal', () => {
    const result = validateBindingRulesJSON('null');
    expect(result.valid).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    const result = validateBindingRulesJSON('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects malformed JSON', () => {
    const result = validateBindingRulesJSON('{ bad }');
    expect(result.valid).toBe(false);
  });
});

describe('formatBindingRules', () => {
  it('pretty-prints an object', () => {
    const result = formatBindingRules({ l: 'and', c: [] });
    expect(result).toBe('{\n  "l": "and",\n  "c": []\n}');
  });

  it('pretty-prints an array', () => {
    const result = formatBindingRules([{ a: 'email' }]);
    expect(JSON.parse(result)).toEqual([{ a: 'email' }]);
  });

  it('parses and re-formats a JSON string', () => {
    const result = formatBindingRules('{"a":1}');
    expect(result).toBe('{\n  "a": 1\n}');
  });

  it('returns empty string for null', () => {
    expect(formatBindingRules(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatBindingRules(undefined)).toBe('');
  });

  it('returns original string for invalid JSON string', () => {
    expect(formatBindingRules('not json')).toBe('not json');
  });
});

describe('defaultBindingRulesJSON', () => {
  it('returns a valid JSON array', () => {
    const result = defaultBindingRulesJSON();
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([]);
  });
});

describe('summarizeBindingRules', () => {
  it('returns dash for null', () => {
    expect(summarizeBindingRules(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(summarizeBindingRules(undefined)).toBe('—');
  });

  it('shows empty array', () => {
    expect(summarizeBindingRules([])).toBe('[]');
  });

  it('shows rule count for non-empty array', () => {
    expect(summarizeBindingRules([{ a: 1 }, { b: 2 }])).toBe('[2 rules]');
  });

  it('shows singular for single rule', () => {
    expect(summarizeBindingRules([{ a: 1 }])).toBe('[1 rule]');
  });

  it('shows object keys summary', () => {
    expect(summarizeBindingRules({ l: 'and', c: [], d: 'extra' })).toBe('{l, c, d}');
    expect(summarizeBindingRules({ a: 1, b: 2, c: 3, d: 4 })).toBe('{a, b, c…}');
  });

  it('handles JSON string input', () => {
    expect(summarizeBindingRules('[{"a":1}]')).toBe('[1 rule]');
  });

  it('truncates non-JSON string', () => {
    expect(summarizeBindingRules('x'.repeat(100))).toBe('x'.repeat(60));
  });
});
