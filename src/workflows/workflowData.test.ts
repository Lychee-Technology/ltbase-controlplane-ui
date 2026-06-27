import { describe, expect, it } from 'vitest';
import { parseWorkflowList, type WorkflowSummary } from './workflowData';

describe('parseWorkflowList', () => {
  it('parses a response with items', () => {
    const result = parseWorkflowList({
      request_id: 'req_123',
      items: [
        { name: 'claim-review', active_version: '1.0', referenced_tools: ['tool_a', 'tool_b'] },
        { name: 'evidence-request', active_version: 'v1', referenced_tools: ['demo.evidence'] },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual<WorkflowSummary>({
      name: 'claim-review',
      activeVersion: '1.0',
      referencedTools: ['tool_a', 'tool_b'],
    });
    expect(result[1].name).toBe('evidence-request');
  });

  it('returns empty array for empty items', () => {
    expect(parseWorkflowList({ items: [] })).toHaveLength(0);
  });

  it('returns empty array for null', () => {
    expect(parseWorkflowList(null)).toHaveLength(0);
  });

  it('returns empty array for undefined', () => {
    expect(parseWorkflowList(undefined)).toHaveLength(0);
  });

  it('returns empty array for missing items key', () => {
    expect(parseWorkflowList({})).toHaveLength(0);
  });

  it('defaults missing fields to empty values', () => {
    const result = parseWorkflowList({ items: [{}] });

    expect(result[0]).toEqual<WorkflowSummary>({
      name: '',
      activeVersion: '',
      referencedTools: [],
    });
  });

  it('handles non-array referenced_tools', () => {
    const result = parseWorkflowList({ items: [{ name: 'test', referenced_tools: null }] });

    expect(result[0].referencedTools).toEqual([]);
  });

  it('returns empty-shape summaries for null or non-object items', () => {
    const result = parseWorkflowList({ items: [null, 'oops', 42] });

    expect(result).toHaveLength(3);
    for (const summary of result) {
      expect(summary).toEqual<WorkflowSummary>({
        name: '',
        activeVersion: '',
        referencedTools: [],
      });
    }
  });
});
