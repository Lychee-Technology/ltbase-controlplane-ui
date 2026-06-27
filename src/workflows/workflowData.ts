export interface WorkflowSummary {
  name: string;
  activeVersion: string;
  referencedTools: string[];
}

export function parseWorkflowList(payload: unknown): WorkflowSummary[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item: unknown) => parseWorkflowSummary(item));
}

function parseWorkflowSummary(payload: unknown): WorkflowSummary {
  const data = payload as Record<string, unknown>;
  return {
    name: String(data.name ?? ''),
    activeVersion: String(data.active_version ?? ''),
    referencedTools: Array.isArray(data.referenced_tools)
      ? (data.referenced_tools as unknown[]).map((t) => String(t))
      : [],
  };
}
