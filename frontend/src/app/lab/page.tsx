'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Home,
  ScrollText,
  Play,
  WandSparkles,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import { BlockNode, type BlockFlowNode, type BlockNodeData } from '@/components/BlockNode';
import { BlockPalette } from '@/components/BlockPalette';
import { RunBlockPanel } from '@/components/RunBlockPanel';
import { ExecutionLogPanel } from '@/components/ExecutionLogPanel';
import {
  FlowContextMenu,
  runBlockItem,
  removeNodeItem,
} from '@/components/FlowContextMenu';
import type { BlockDefinition } from 'shared';
import { getBlockById } from 'shared';
import { topologicalOrder, getEntryInputs, getInputSource } from '@/lib/workflowLogic';
import { EntryInputsModal, type EntryInputField } from '@/components/EntryInputsModal';
import { useFlowRunStore } from '@/store/flowRunStore';
import { useExecutionLog } from '@/store/executionLog';
import { useTheme } from '@/contexts/ThemeContext';

type FlowNode = BlockFlowNode;
type FlowEdge = Edge;

const nodeTypes: NodeTypes = { block: BlockNode };

const DEFAULT_NODES: FlowNode[] = [
  {
    id: '1',
    type: 'block',
    position: { x: 100, y: 100 },
    data: { blockId: 'summarize-text', label: 'Summarize Text', icon: 'Brain' },
  },
  {
    id: '2',
    type: 'block',
    position: { x: 400, y: 100 },
    data: { blockId: 'extract-emails', label: 'Extract Emails', icon: 'Mail' },
  },
];

const DEFAULT_EDGES: FlowEdge[] = [];

/** Test workflow: Constant → Summarize Text. Use "Prepopulate" button to load this. */
function getPrepopulateFlow(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const constantBlock = getBlockById('constant');
  const summarizeBlock = getBlockById('summarize-text');
  const nodes: FlowNode[] = [
    {
      id: 'prepop-constant',
      type: 'block',
      position: { x: 100, y: 150 },
      data: {
        blockId: 'constant',
        label: constantBlock?.name ?? 'Constant',
        icon: constantBlock?.icon ?? 'Type',
      },
    },
    {
      id: 'prepop-summarize',
      type: 'block',
      position: { x: 400, y: 150 },
      data: {
        blockId: 'summarize-text',
        label: summarizeBlock?.name ?? 'Summarize Text',
        icon: summarizeBlock?.icon ?? 'Brain',
      },
    },
  ];
  const edges: FlowEdge[] = [
    {
      id: 'prepop-e1',
      source: 'prepop-constant',
      target: 'prepop-summarize',
      sourceHandle: 'value',
      targetHandle: 'text',
    },
  ];
  return { nodes, edges };
}

const FLOW_STORAGE_KEY = 'devfest-flow';

function loadFlow(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (typeof window === 'undefined') return { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
  try {
    const raw = localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
    const parsed = JSON.parse(raw) as { nodes?: FlowNode[]; edges?: FlowEdge[] };
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return { nodes: parsed.nodes, edges: parsed.edges };
    }
  } catch {
    // ignore
  }
  return { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
}

const DRAG_TYPE = 'application/reactflow';

type ContextMenuState = { node: FlowNode; x: number; y: number } | null;
type RunPanelState = { id: string; data: BlockNodeData } | null;

function FlowCanvas({
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
  contextMenu,
  setContextMenu,
  runPanelNode,
  setRunPanelNode,
  selectedNodeIds,
  setSelectedNodeIds,
  removeNodes,
  onNodeDoubleClick,
  theme,
}: {
  nodes: FlowNode[];
  setNodes: (u: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => void;
  onNodesChange: OnNodesChange<FlowNode>;
  edges: FlowEdge[];
  setEdges: (u: FlowEdge[] | ((prev: FlowEdge[]) => FlowEdge[])) => void;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  contextMenu: ContextMenuState;
  setContextMenu: (v: ContextMenuState) => void;
  runPanelNode: RunPanelState;
  setRunPanelNode: (v: RunPanelState) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  removeNodes: (ids: string[]) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: FlowNode) => void;
  theme: 'dark' | 'light';
}) {
  const { screenToFlowPosition } = useReactFlow();
  const isDark = theme === 'dark';
  const majorGrid = isDark ? '#314053' : '#cbd5e1';
  const minorGrid = isDark ? '#1d2838' : '#e2e8f0';
  const lineColor = isDark ? '#22c55e' : '#15803d';

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(DRAG_TYPE);
      if (!raw) return;
      let payload: { type: string; blockId?: string; label?: string; icon?: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (payload.type !== 'block' || !payload.blockId || !payload.label) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: FlowNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'block',
        position: { x: position.x - 90, y: position.y - 24 },
        data: {
          blockId: payload.blockId,
          label: payload.label,
          icon: payload.icon ?? 'Brain',
        },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      event.preventDefault();
      setContextMenu({ node, x: event.clientX, y: event.clientY });
    },
    [setContextMenu]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: FlowNode[] }) => {
      setSelectedNodeIds(selected.map((n) => n.id));
    },
    [setSelectedNodeIds]
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNodeIds([]);
  }, [setContextMenu, setSelectedNodeIds]);

  // Delete / Backspace to remove selected nodes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement;
      if (target.closest('textarea') || target.closest('input')) return;
      if (selectedNodeIds.length > 0) {
        e.preventDefault();
        removeNodes(selectedNodeIds);
        setSelectedNodeIds([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeIds, removeNodes, setSelectedNodeIds]);

  const menuItems = contextMenu
    ? [
      runBlockItem(() => {
        if (contextMenu.node.data) {
          setRunPanelNode({
            id: contextMenu.node.id,
            data: {
              blockId: String(contextMenu.node.data.blockId),
              label: String(contextMenu.node.data.label),
              icon: contextMenu.node.data.icon,
            },
          });
        }
        setContextMenu(null);
      }),
      removeNodeItem(() => {
        removeNodes([contextMenu.node.id]);
        setContextMenu(null);
      }),
    ]
    : [];

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDoubleClick={onNodeDoubleClick}
        onSelectionChange={onSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-app"
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: 'default' }}
        connectionLineStyle={{ stroke: lineColor, strokeWidth: 2 }}
      >
        <Background color={minorGrid} gap={16} size={0.8} />
        <Background color={majorGrid} gap={80} size={1.15} />
        <Controls className="!border-app !bg-app-surface !text-app-soft" />
        <MiniMap
          nodeColor={lineColor}
          maskColor={isDark ? 'rgba(2,6,23,0.78)' : 'rgba(226,232,240,0.72)'}
          className="!border-app !bg-app-surface"
        />
        <Panel position="top-center" className="rounded-full border border-app bg-app-surface px-3 py-1.5 shadow-sm backdrop-blur">
          <span className="text-app-soft text-xs">
            Drag to add blocks, connect outputs to inputs, double-click nodes to run
          </span>
        </Panel>
        {nodes.length === 0 && (
          <Panel position="top-left" className="mt-20 ml-8 max-w-sm">
            <div className="rounded-2xl border border-app bg-app-surface p-4 text-app-soft text-sm shadow-lg backdrop-blur">
              <p className="font-semibold text-app-fg">Start your flow</p>
              <p className="mt-1">Drag blocks from the left panel or click a block to place it on canvas.</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
      {contextMenu && (
        <FlowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export default function DashboardPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(DEFAULT_EDGES);

  // Load from localStorage only after hydration to avoid mismatch
  useEffect(() => {
    const saved = loadFlow();
    setNodes(saved.nodes);
    setEdges(saved.edges);
  }, [setNodes, setEdges]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [runPanelNode, setRunPanelNode] = useState<RunPanelState>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [entryModalFields, setEntryModalFields] = useState<EntryInputField[] | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNodeOutput = useFlowRunStore((s) => s.setNodeOutput);
  const getOutput = useFlowRunStore((s) => s.getOutput);
  const clearRunCache = useFlowRunStore((s) => s.clearAll);
  const { isVisible, setVisible } = useExecutionLog();
  const { theme } = useTheme();

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          FLOW_STORAGE_KEY,
          JSON.stringify({ nodes, edges })
        );
      } catch {
        // ignore
      }
      saveTimeoutRef.current = null;
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges]);

  const removeNodes = useCallback((ids: Set<string> | string[]) => {
    const idSet = new Set(ids);
    setNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
    setEdges((prev) =>
      prev.filter((e) => !idSet.has(e.source) && !idSet.has(e.target))
    );
    setRunPanelNode((prev) => (prev && idSet.has(prev.id) ? null : prev));
  }, [setNodes, setEdges]);

  const handleClearCanvas = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm('Clear all blocks and connections from the canvas?')) {
      setNodes([]);
      setEdges([]);
      setRunPanelNode(null);
      setSelectedNodeIds([]);
    }
  }, [setNodes, setEdges]);

  const handlePrepopulate = useCallback(() => {
    const { nodes: prepNodes, edges: prepEdges } = getPrepopulateFlow();
    setNodes(prepNodes);
    setEdges(prepEdges);
    setRunPanelNode(null);
    setSelectedNodeIds([]);
    clearRunCache();
  }, [setNodes, setEdges, clearRunCache]);

  const handleRunSelected = useCallback(() => {
    if (selectedNodeIds.length !== 1) return;
    const node = nodes.find((n) => n.id === selectedNodeIds[0]);
    if (node?.data) {
      setRunPanelNode({
        id: node.id,
        data: {
          blockId: String(node.data.blockId),
          label: String(node.data.label),
          icon: node.data.icon,
        },
      });
    }
  }, [selectedNodeIds, nodes]);

  const runWorkflowWithEntryValues = useCallback(
    async (entryValues: Record<string, Record<string, string>>) => {
      setWorkflowError(null);
      setEntryModalFields(null);
      const order = topologicalOrder(nodes, edges);
      if (!order || order.length === 0) {
        setWorkflowError(order === null ? 'Workflow has a cycle.' : 'No nodes to run.');
        return;
      }
      setWorkflowRunning(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      try {
        for (const nodeId of order) {
          const node = nodes.find((n) => n.id === nodeId);
          if (!node?.data?.blockId) continue;
          const block = getBlockById(node.data.blockId as import('shared').BlockId);
          if (!block) continue;
          const inputs: Record<string, string> = {};
          for (const input of block.inputs ?? []) {
            const src = getInputSource(nodeId, input.key, edges, nodes);
            if (src.type === 'connected') {
              const v = getOutput(src.sourceNodeId, src.sourceHandle);
              inputs[input.key] = v != null ? String(v) : '';
            } else {
              inputs[input.key] = entryValues[nodeId]?.[input.key] ?? '';
            }
          }
          const res = await fetch(`${API_URL}/api/run-block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': 'demo-user-1' },
            body: JSON.stringify({ blockId: block.id, inputs }),
          });
          const json = await res.json();
          if (!res.ok) {
            setWorkflowError(json.error ?? `Failed at ${node.data?.label ?? nodeId}`);
            return;
          }
          setNodeOutput(nodeId, json.outputs ?? {});
        }
      } catch (e) {
        setWorkflowError(e instanceof Error ? e.message : 'Workflow run failed');
      } finally {
        setWorkflowRunning(false);
      }
    },
    [nodes, edges, getOutput, setNodeOutput]
  );

  const handleRunWorkflow = useCallback(() => {
    setWorkflowError(null);
    const order = topologicalOrder(nodes, edges);
    if (!order || order.length === 0) {
      setWorkflowError(order === null ? 'Workflow has a cycle.' : 'Add blocks to run.');
      return;
    }
    const entryFields = getEntryInputs(nodes, edges, (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      const block = getBlockById(node?.data?.blockId as import('shared').BlockId);
      return (block?.inputs ?? []).map((i) => ({ key: i.key, label: i.label }));
    });
    if (entryFields.length > 0) {
      setEntryModalFields(entryFields);
    } else {
      runWorkflowWithEntryValues({});
    }
  }, [nodes, edges, runWorkflowWithEntryValues]);

  const addBlockAt = useCallback(
    (block: BlockDefinition, position?: { x: number; y: number }) => {
      const pos = position ?? {
        x: 120 + (nodes.length % 4) * 240,
        y: 100 + Math.floor(nodes.length / 4) * 120,
      };
      const newNode: FlowNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'block',
        position: { x: pos.x, y: pos.y },
        data: {
          blockId: block.id,
          label: block.name,
          icon: block.icon,
        },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [nodes.length, setNodes]
  );

  const handleExport = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ nodes, edges, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `devfest-flow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [nodes, edges]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string) as {
            nodes?: FlowNode[];
            edges?: FlowEdge[];
          };
          if (Array.isArray(json.nodes)) setNodes(json.nodes);
          if (Array.isArray(json.edges)) setEdges(json.edges);
        } catch {
          window.alert('Invalid flow file.');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges]
  );

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const nodeIds = new Set(nodes.map((n) => n.id));
    const incoming = new Set(edges.map((e) => e.target));
    const roots = nodes.filter((n) => !incoming.has(n.id));
    const layers: string[][] = [];
    const assigned = new Set<string>();
    let current = roots.length > 0 ? roots.map((n) => n.id) : Array.from(nodeIds);
    let layer = 0;
    while (current.length > 0 && layer < 20) {
      layers.push(current);
      current.forEach((id) => assigned.add(id));
      const next = new Set<string>();
      edges.forEach((e) => {
        if (current.includes(e.source) && !assigned.has(e.target)) next.add(e.target);
      });
      current = Array.from(next);
      layer++;
    }
    const remaining = nodes.filter((n) => !assigned.has(n.id)).map((n) => n.id);
    if (remaining.length > 0) layers.push(remaining);
    const padX = 220;
    const padY = 100;
    setNodes((prev) =>
      prev.map((node) => {
        let layerIndex = -1;
        let indexInLayer = 0;
        for (let i = 0; i < layers.length; i++) {
          const idx = layers[i].indexOf(node.id);
          if (idx >= 0) {
            layerIndex = i;
            indexInLayer = idx;
            break;
          }
        }
        if (layerIndex < 0) return node;
        const x = 80 + layerIndex * padX;
        const y = 80 + indexInLayer * padY;
        return { ...node, position: { x, y } };
      })
    );
  }, [nodes, edges, setNodes]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Lab</h1>
      <p className="mt-1 text-sm text-app-soft">
        Build block-based workflows, run them end-to-end, and inspect outputs as you iterate.
      </p>

      <div className="mt-5 rounded-2xl border border-app bg-app-surface/75 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <button
            type="button"
            onClick={handleRunWorkflow}
            disabled={nodes.length === 0 || workflowRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            {workflowRunning ? 'Running…' : 'Run workflow'}
          </button>
          <button
            type="button"
            onClick={handleRunSelected}
            disabled={selectedNodeIds.length !== 1}
            className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg disabled:opacity-40"
          >
            <WandSparkles className="h-4 w-4" />
            Run selected
          </button>
          <button
            type="button"
            onClick={handleAutoLayout}
            disabled={nodes.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg disabled:opacity-40"
          >
            <LayoutGrid className="h-4 w-4" />
            Auto-layout
          </button>
          <button
            type="button"
            onClick={handlePrepopulate}
            className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
            title="Load Constant → Summarize test flow"
          >
            Prepopulate
          </button>
          <button
            type="button"
            onClick={() => setVisible(!isVisible)}
            className={`inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm transition ${
              isVisible
                ? 'bg-blue-600/15 text-blue-300'
                : 'text-app-soft hover:bg-app-surface hover:text-app-fg'
            }`}
          >
            <ScrollText className="h-4 w-4" />
            Logs
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
          >
            Import
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
          >
            Export
          </button>
          <button
            type="button"
            onClick={clearRunCache}
            className="rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
            title="Clear cached outputs"
          >
            Clear cache
          </button>
          <button
            type="button"
            onClick={handleClearCanvas}
            className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear canvas
          </button>
          <span className="ml-auto rounded-full border border-app px-2.5 py-1 text-xs text-app-soft">
            {nodes.length} block{nodes.length !== 1 ? 's' : ''}
          </span>
        </div>
        {workflowError && (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {workflowError}
          </p>
        )}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-app bg-app-surface/70">
        <BlockPalette onAddBlock={addBlockAt} />
        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 flex-1">
            <ReactFlowProvider>
              <FlowCanvas
                nodes={nodes}
                setNodes={setNodes}
                onNodesChange={onNodesChange}
                edges={edges}
                setEdges={setEdges}
                onEdgesChange={onEdgesChange}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                runPanelNode={runPanelNode}
                setRunPanelNode={setRunPanelNode}
                selectedNodeIds={selectedNodeIds}
                setSelectedNodeIds={setSelectedNodeIds}
                removeNodes={removeNodes}
                theme={theme}
                onNodeDoubleClick={(e, node) => {
                  if (node.data) {
                    setRunPanelNode({
                      id: node.id,
                      data: {
                        blockId: String(node.data.blockId),
                        label: String(node.data.label),
                        icon: node.data.icon,
                      },
                    });
                  }
                }}
              />
            </ReactFlowProvider>
          </div>
          {runPanelNode && (
            <RunBlockPanel
              nodeId={runPanelNode.id}
              data={runPanelNode.data}
              nodes={nodes}
              edges={edges}
              onClose={() => setRunPanelNode(null)}
            />
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      <ExecutionLogPanel />
      {entryModalFields && entryModalFields.length > 0 && (
        <EntryInputsModal
          fields={entryModalFields}
          onSubmit={(values) => runWorkflowWithEntryValues(values)}
          onCancel={() => setEntryModalFields(null)}
        />
      )}
    </div>
  );
}
