import type { OrgTree } from './organizationData';

interface Props {
  tree: OrgTree[];
  selectedOuId: string | null;
  onSelect: (ouId: string) => void;
}

export function OrganizationTree({ tree, selectedOuId, onSelect }: Props) {
  return (
    <div className="org-tree">
      {tree.map((node) => (
        <TreeNode
          key={node.unit.ouId}
          node={node}
          selectedOuId={selectedOuId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function TreeNode({ node, selectedOuId, onSelect }: { node: OrgTree; selectedOuId: string | null; onSelect: (ouId: string) => void }) {
  const hasChildren = node.children.length > 0;
  const isSelected = selectedOuId === node.unit.ouId;

  const labelClass = isSelected ? 'org-tree-label org-tree-selected' : 'org-tree-label';
  const placeholderClass = hasChildren ? '' : 'org-tree-expander-placeholder';

  return (
    <div className="org-tree-node">
      <div className={labelClass} onClick={() => onSelect(node.unit.ouId)}>
        <span className={`org-tree-expander ${placeholderClass}`}>
          ▸
        </span>
        <span>{node.unit.name || node.unit.ouId}</span>
      </div>
      {hasChildren && (
        <div className="org-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.unit.ouId}
              node={child}
              selectedOuId={selectedOuId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
