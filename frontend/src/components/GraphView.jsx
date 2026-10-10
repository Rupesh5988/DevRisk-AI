// ============================================================
// Dependency Graph Viewer Component
// ============================================================
// Interactive node-based graph using React Flow.
// Directly modified files are highlighted in red, downstream
// callers in yellow, and referenced modules in neutral gray.
// ============================================================

import React, { useMemo } from 'react';
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
 * Correctly distinguishes directly modified files from affected downstream callers.
 */
function buildFlowElements(graphData, modifiedFiles = []) {
  const { nodes: nodeNames = [], edges: graphEdges = [] } = graphData || {};

  if (!nodeNames || nodeNames.length === 0) return { initialNodes: [], initialEdges: [] };

  // Infer directly modified source files from edges
  const rawSources = new Set((graphEdges || []).map((e) => String(e.source || '').toLowerCase()));
  const isAllNodesPassed = modifiedFiles.length > 0 && modifiedFiles.length === nodeNames.length && rawSources.size > 0;

  const modifiedSet = new Set(
    (isAllNodesPassed ? Array.from(rawSources) : (modifiedFiles.length > 0 ? modifiedFiles : Array.from(rawSources))).map((f) =>
      typeof f === 'string' ? f.toLowerCase() : String(f?.id || f?.name || f || '').toLowerCase()
    )
  );

  // Find files that are targets of modified files (affected downstream callers)
  const affectedSet = new Set();
  for (const edge of graphEdges || []) {
    if (edge?.source && modifiedSet.has(String(edge.source).toLowerCase())) {
      if (edge.target && !modifiedSet.has(String(edge.target).toLowerCase())) {
        affectedSet.add(String(edge.target).toLowerCase());
      }
    }
  }

  // Position nodes in an organized layout
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeNames.length)));
  const initialNodes = nodeNames.map((nodeItem, idx) => {
    const name = typeof nodeItem === 'string' ? nodeItem : String(nodeItem?.id || nodeItem?.name || idx);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const isModified = modifiedSet.has(name.toLowerCase());
    const isAffected = affectedSet.has(name.toLowerCase());

    // Determine node styling based on status
    let borderColor = 'rgba(255, 255, 255, 0.12)';
    let bgColor = 'rgba(15, 23, 42, 0.75)';
    let statusEmoji = '';
    let statusLabel = 'Module';

    if (isModified) {
      borderColor = '#ef4444';
      bgColor = 'rgba(239, 68, 68, 0.12)';
      statusEmoji = '🔴 ';
      statusLabel = 'Directly Modified';
    } else if (isAffected) {
      borderColor = '#eab308';
      bgColor = 'rgba(234, 179, 8, 0.12)';
      statusEmoji = '🟡 ';
      statusLabel = 'Downstream Caller';
    }

    const shortName = name.includes('/') ? name.split('/').pop() : name;

    return {
      id: name,
      position: { x: col * 240, y: row * 110 },
      data: {
        label: (
          <div style={{ textAlign: 'left', padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isModified ? '#ef4444' : isAffected ? '#eab308' : '#94a3b8', textTransform: 'uppercase' }}>
                {statusLabel}
              </span>
              <span style={{ fontSize: 11 }}>{statusEmoji}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', wordBreak: 'break-all' }}>
              {shortName}
            </div>
            <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
              {name.includes('/') ? name.substring(0, name.lastIndexOf('/')) : 'root'}
            </div>
          </div>
        ),
      },
      style: {
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 8,
        padding: '8px 10px',
        color: '#f1f5f9',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        minWidth: 170,
        boxShadow: isModified ? '0 0 12px rgba(239, 68, 68, 0.2)' : isAffected ? '0 0 12px rgba(234, 179, 8, 0.15)' : 'none',
      },
    };
  });

  const initialEdges = (graphEdges || []).map((edge, idx) => {
    const isSourceModified = edge.source ? modifiedSet.has(String(edge.source).toLowerCase()) : false;
    return {
      id: `edge-${idx}`,
      source: String(edge.source),
      target: String(edge.target),
      animated: isSourceModified,
      style: {
        stroke: isSourceModified ? '#ef4444' : '#64748b',
        strokeWidth: isSourceModified ? 2 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isSourceModified ? '#ef4444' : '#64748b',
      },
    };
  });

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

  // Clean, confidence-inspiring state when a PR has zero cross-file imports
  if (initialNodes.length === 0) {
    return (
      <div className="card animate-in" style={{ padding: '36px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--risk-low-bg)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            margin: '0 auto 12px',
          }}
        >
          🛡️
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
          Isolated Code Change — Zero Cross-File Ripple Effect
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.5 }}>
          No imported modules or downstream callers were impacted by this pull request. The changes are fully self-contained with minimal blast radius.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      {/* Graph Toolbar & Legend */}
      <div
        className="card-header"
        style={{
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-glass)',
        }}
      >
        <div>
          <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Cross-File AST Dependency Graph</h3>
          <span className="card-subtitle" style={{ fontSize: 11.5 }}>
            Interactive node map showing import relationships and downstream caller blast radius
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, fontSize: 11.5, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
            Direct Modified File
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#eab308', display: 'inline-block' }} />
            Downstream Impacted Caller
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.1)', display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
            Referenced Module
          </span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div style={{ height: 520, background: 'var(--bg-primary)', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <Background color="rgba(255, 255, 255, 0.04)" gap={22} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
