import type { GpuTwin, ServerTwin } from '../../../types';
import type { Edge, Node } from '@xyflow/react';
import { useMemo } from 'react';
import { ReactFlow, Background, Position, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';

interface Props {
  server: ServerTwin;
}

const NODE_WIDTH = 140;
const NODE_GAP_X = 150;
const GROUP_GAP_X = 80;
const GROUP_GAP_Y = 160;
const CONTAINER_HEIGHT = 400;

const GROUP_COLORS = [
  '#5B8CFF',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

function getGpuGroup(gpu: GpuTwin): { groupKey: string; displayName: string } {
  if (gpu.services.length === 0) {
    return { groupKey: 'idle', displayName: 'Idle' };
  }
  const firstSvc = gpu.services[0];
  return { groupKey: firstSvc.service_name, displayName: firstSvc.service_name };
}

function groupGpusByService(gpus: GpuTwin[]): Array<{
  groupKey: string;
  displayName: string;
  gpus: GpuTwin[];
}> {
  const groupMap = new Map<string, { displayName: string; gpus: GpuTwin[] }>();

  gpus.forEach((gpu) => {
    const { groupKey, displayName } = getGpuGroup(gpu);
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { displayName, gpus: [] });
    }
    groupMap.get(groupKey)!.gpus.push(gpu);
  });

  const result = Array.from(groupMap.entries())
    .map(([groupKey, data]) => ({
      groupKey,
      displayName: data.displayName,
      gpus: data.gpus.sort((a, b) => a.index - b.index),
    }))
    .sort((a, b) => {
      if (a.groupKey === 'idle') return 1;
      if (b.groupKey === 'idle') return -1;
      return b.gpus.length - a.gpus.length;
    });

  return result;
}

function getGroupColor(groupKey: string): string {
  if (groupKey === 'idle') return '#D1D5DB';
  const idx = groupKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GROUP_COLORS.length;
  return GROUP_COLORS[idx];
}

function createGroupedNodes(gpus: GpuTwin[]): Node[] {
  const groups = groupGpusByService(gpus);
  const nodes: Node[] = [];

  let groupStartX = 0;

  groups.forEach((group, groupIdx) => {
    const color = getGroupColor(group.groupKey);
    let xPos = groupStartX;
    const yBase = groupIdx * GROUP_GAP_Y;

    // Group header label node
    nodes.push({
      id: `group-label-${groupIdx}`,
      type: 'default',
      position: { x: xPos + 4, y: yBase - 28 },
      data: {
        label: (
          <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            {group.displayName}
          </div>
        ),
      },
      style: {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        fontSize: 10,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    });

    group.gpus.forEach((gpu) => {
      const nodeId = `gpu-${gpu.index}`;
      const labelContent = (
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>GPU {gpu.index}</div>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{gpu.name}</div>
        </div>
      );

      nodes.push({
        id: nodeId,
        type: 'default',
        position: { x: xPos, y: yBase },
        data: {
          label: labelContent,
        },
        style: {
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          textAlign: 'center',
          width: NODE_WIDTH,
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          background: 'rgba(255,255,255,0.95)',
          border: `1.5px solid ${color}35`,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      xPos += NODE_GAP_X;
    });

    groupStartX += group.gpus.length * NODE_GAP_X + GROUP_GAP_X;
  });

  return nodes;
}

function createSmoothEdges(gpus: GpuTwin[]): Edge[] {
  const serviceGroups: Record<string, number[]> = {};
  gpus.forEach((gpu) => {
    if (gpu.services.length === 0) return;
    const svcName = gpu.services[0].service_name;
    if (!serviceGroups[svcName]) serviceGroups[svcName] = [];
    if (!serviceGroups[svcName].includes(gpu.index)) {
      serviceGroups[svcName].push(gpu.index);
    }
  });

  const edges: Edge[] = [];
  Object.entries(serviceGroups).forEach(([serviceName, indices]) => {
    const sortedIndices = [...indices].sort((a, b) => a - b);
    const color = getGroupColor(serviceName);
    for (let i = 0; i < sortedIndices.length - 1; i++) {
      edges.push({
        id: `e-${serviceName}-${sortedIndices[i]}-${sortedIndices[i + 1]}`,
        source: `gpu-${sortedIndices[i]}`,
        target: `gpu-${sortedIndices[i + 1]}`,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: color,
          strokeWidth: 2.5,
          opacity: 0.7,
        },
        zIndex: 0,
      });
    }
  });
  return edges;
}

function TopologyControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-colors shadow-sm"
        title="放大"
      >
        <ZoomIn size={14} />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-colors shadow-sm"
        title="缩小"
      >
        <ZoomOut size={14} />
      </button>
      <button
        onClick={() => fitView({ duration: 300, padding: 0.15 })}
        className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-colors shadow-sm"
        title="适应"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}

export default function GpuTopology({ server }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white/60 backdrop-blur-sm" style={{ height: CONTAINER_HEIGHT }}>
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GPU Topology</span>
        <span className="text-[10px] text-gray-400">{server.name}</span>
      </div>
      <ReactFlowProvider>
        <TopologyContent server={server} />
      </ReactFlowProvider>
    </div>
  );
}

function TopologyContent({ server }: Props) {
  const nodes = useMemo(() => createGroupedNodes(server.gpus), [server.gpus]);
  const edges = useMemo(() => createSmoothEdges(server.gpus), [server.gpus]);

  return (
    <div className="relative" style={{ height: CONTAINER_HEIGHT - 42 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.15, minZoom: 0.3, maxZoom: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#5B8CFF', strokeWidth: 1.5, opacity: 0.4 },
        }}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#E5E7EB" gap={20} size={0.6} />
      </ReactFlow>
      <TopologyControls />
    </div>
  );
}
