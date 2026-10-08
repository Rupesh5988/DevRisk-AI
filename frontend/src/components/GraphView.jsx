// ============================================================
// Dependency Graph Viewer Component
// ============================================================
// Interactive node-based graph using React Flow.
// Modified files are highlighted in red, affected files in yellow.
// ============================================================

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

/**
 * Converts the dependency graph data into React Flow nodes and edges.
 * Applies automatic layout positioning.
 */
function buildFlowElements(graphData, modifiedFiles = []) {
  const { nodes: nodeNames = [], edges: graphEdges = [] } = graphData || {};

  if (!nodeNames || nodeNames.length === 0) return { initialNodes: [], initialEdges: [] };

  const modifiedSet = new Set(
    (modifiedFiles || []).map((f) =>
      typeof f === 'string' ? f.toLowerCase() : String(f?.id || f?.name || f || '').toLowerCase()
    )
  );

  // Find files that are targets of modified files (affected by the change)
  const affectedSet = new Set();
  for (const edge of graphEdges || []) {
    if (edge?.source && modifiedSet.has(String(edge.source).toLowerCase())) {
      if (edge.target) affectedSet.add(String(edge.target).toLowerCase());
    }
  }

  // Position nodes in a grid layout
  const cols = Math.ceil(Math.sqrt(nodeNames.length));
  const initialNodes = nodeNames.map((nodeItem, idx) => {
    const name = typeof nodeItem === 'string' ? nodeItem : String(nodeItem?.id || nodeItem?.name || idx);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const isModified = modifiedSet.has(name.toLowerCase());
    const isAffected = affectedSet.has(name.toLowerCase());

    // Determine node style based on status
    let borderColor = 'rgba(255,255,255,0.1)';
    let bgColor = 'rgba(15, 20, 40, 0.65)';
    let statusEmoji = '';

    if (isModified) {
      borderColor = '#ef4444';
      bgColor = 'rgba(239, 68, 68, 0.1)';
      statusEmoji = '🔴 ';
    } else if (isAffected) {
      borderColor = '#eab308';
      bgColor = 'rgba(234, 179, 8, 0.1)';
      statusEmoji = '🟡 ';
    }

    // Extract just the filename for display
    const shortName = name.includes('/') ? name.split('/').pop() : name;

    return {
      id: name,
      position: { x: col * 220, y: row * 100 },
      data: {
        label: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>
              {statusEmoji}{shortName}
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
              {name.includes('/') ? name.substring(0, name.lastIndexOf('/')) : 'root'}
            </div>
          </div>
        ),
      },
      style: {
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 8,
        padding: '8px 12px',
        color: '#f1f5f9',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        minWidth: 160,
      },
    };
  });

  const initialEdges = (graphEdges || []).map((edge, idx) => ({
    id: `edge-${idx}`,
    source: String(edge.source),
    target: String(edge.target),
    animated: edge.source ? modifiedSet.has(String(edge.source).toLowerCase()) : false,
    style: {
      stroke: edge.source && modifiedSet.has(String(edge.source).toLowerCase()) ? '#ef4444' : '#64748b',
      strokeWidth: 1.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.source && modifiedSet.has(String(edge.source).toLowerCase()) ? '#ef4444' : '#64748b',
    },
  }));

  return { initialNodes, initialEdges };
}

export default function GraphView({ graphData = {}, modifiedFiles = [] }) {
  const { initialNodes, initialEdges } = useMemo(
    () => buildFlowElements(graphData, modifiedFiles),
    [graphData, modifiedFiles]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (initialNodes.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dependency Graph</h3>
        </div>
        <div className="empty-state" style={{ minHeight: 300 }}>
          <div className="empty-state-icon">🔗</div>
          <div className="empty-state-title">No Dependency Data</div>
          <div className="empty-state-text">
            Dependency graph is only available for JavaScript/Node.js repositories with import/require statements.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-header" style={{ padding: '16px 24px' }}>
        <h3 className="card-title">Dependency Graph</h3>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
            Modified
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#eab308', display: 'inline-block' }} />
            Affected
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.1)', display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
            Unaffected
          </span>
        </div>
      </div>
      <div style={{ height: 500, background: 'var(--bg-primary)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <Background color="rgba(255,255,255,0.03)" gap={24} />
        </ReactFlow>
      </div>
    </div>
  );
}
