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
  reconnectEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Home, Play, Trash2, LayoutGrid, Download, Upload, ScrollText, Settings, Undo2, Redo2 } from 'lucide-react';

import { WorkflowNode } from '@/components/workflow/WorkflowNode';
import { WorkflowPalette } from '@/components/workflow/WorkflowPalette';
import { ConfigModalRouter } from '@/components/workflow/ConfigModals';
import { workflowEngine } from '@/services/workflowEngine';
import type { WorkflowBlockTemplate, WorkflowNodeData, NodeConfig, WorkflowExecution } from '@/types/workflowTypes';
import {
  FlowContextMenu,
  runBlockItem,
  removeNodeItem,
} from '@/components/FlowContextMenu';
import { RunBlockPanel } from '@/components/RunBlockPanel';
import { useFlowRunStore } from '@/store/flowRunStore';
import { useExecutionLog } from '@/store/executionLog';

// ══════════════════════════════════════════════════════
//  React Flow node type registration
// ══════════════════════════════════════════════════════
const nodeTypes: NodeTypes = { workflow: WorkflowNode as any };

const BADGE_LABELS: Record<string, string> = {
  trigger: 'TRIGGER',
  ai: 'AI',
  condition: 'IF',
  action: 'ACTION',
};

// ── LocalStorage persistence ──
const WF_STORAGE_KEY = 'devfest-workflow';

function loadWorkflow(): { nodes: Node[]; edges: Edge[] } {
  if (typeof window === 'undefined') return { nodes: [], edges: [] };
  try {
    const raw = localStorage.getItem(WF_STORAGE_KEY);
    if (!raw) return { nodes: [], edges: [] };
    const parsed = JSON.parse(raw) as { nodes?: Node[]; edges?: Edge[] };
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed as { nodes: Node[]; edges: Edge[] };
  } catch { /* ignore */ }
  return { nodes: [], edges: [] };
}

type ContextMenuState = { node: Node; x: number; y: number } | null;
type RunPanelState = { id: string; data: { blockId: string; label: string; icon?: string } } | null;

/** Test 1: Feedback Loop (Agent-like refinement with condition) */
function getTestWorkflow1(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: 'test1-trigger',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Manual Trigger',
        icon: 'Zap',
        category: 'trigger',
        blockType: 'manual_trigger',
        badgeLabel: 'TRIGGER',
        config: { text: 'This is a sample document about AI and machine learning. Contact us at test@example.com for more information.' },
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test1-summarize',
      type: 'workflow',
      position: { x: 420, y: 120 },
      data: {
        label: 'Summarize Text',
        icon: 'Brain',
        category: 'ai',
        blockType: 'summarize-text',
        badgeLabel: 'AI',
        config: {},
        blockId: 'summarize-text',
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test1-classify',
      type: 'workflow',
      position: { x: 740, y: 120 },
      data: {
        label: 'Classify Input',
        icon: 'Tag',
        category: 'ai',
        blockType: 'classify-input',
        badgeLabel: 'AI',
        config: {},
        blockId: 'classify-input',
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test1-confidence',
      type: 'workflow',
      position: { x: 740, y: 280 },
      data: {
        label: 'Confidence Check',
        icon: 'CheckCircle',
        category: 'condition',
        blockType: 'confidence_check',
        badgeLabel: 'IF',
        config: { threshold: 80 },
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test1-output',
      type: 'workflow',
      position: { x: 1060, y: 280 },
      data: {
        label: 'Log Output',
        icon: 'ScrollText',
        category: 'action',
        blockType: 'log_output',
        badgeLabel: 'ACTION',
        config: {},
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
  ];
  const edges: Edge[] = [
    {
      id: 'test1-e1',
      source: 'test1-trigger',
      target: 'test1-summarize',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    },
    {
      id: 'test1-e2',
      source: 'test1-summarize',
      target: 'test1-classify',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    },
    {
      id: 'test1-e3',
      source: 'test1-classify',
      target: 'test1-confidence',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    },
    // Feedback loop: if confidence fails, go back to summarize
    {
      id: 'test1-e4',
      source: 'test1-confidence',
      target: 'test1-summarize',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b', width: 16, height: 16 },
    },
    // Success path: if confidence passes, output the result
    {
      id: 'test1-e5',
      source: 'test1-confidence',
      target: 'test1-output',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981', width: 16, height: 16 },
    },
  ];
  return { nodes, edges };
}

/** Test 2: Linear Workflow (No feedback loop) */
function getTestWorkflow2(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: 'test2-trigger',
      type: 'workflow',
      position: { x: 100, y: 150 },
      data: {
        label: 'Manual Trigger',
        icon: 'Zap',
        category: 'trigger',
        blockType: 'manual_trigger',
        badgeLabel: 'TRIGGER',
        config: { text: 'Hello world! Please contact john@company.com or jane@startup.io for partnership inquiries.' },
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test2-summarize',
      type: 'workflow',
      position: { x: 420, y: 150 },
      data: {
        label: 'Summarize Text',
        icon: 'Brain',
        category: 'ai',
        blockType: 'summarize-text',
        badgeLabel: 'AI',
        config: {},
        blockId: 'summarize-text',
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test2-extract',
      type: 'workflow',
      position: { x: 740, y: 150 },
      data: {
        label: 'Extract Emails',
        icon: 'Mail',
        category: 'ai',
        blockType: 'extract-emails',
        badgeLabel: 'AI',
        config: {},
        blockId: 'extract-emails',
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
    {
      id: 'test2-log',
      type: 'workflow',
      position: { x: 1060, y: 150 },
      data: {
        label: 'Log Output',
        icon: 'ScrollText',
        category: 'action',
        blockType: 'log_output',
        badgeLabel: 'ACTION',
        config: {},
      } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
    },
  ];
  const edges: Edge[] = [
    {
      id: 'test2-e1',
      source: 'test2-trigger',
      target: 'test2-summarize',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    },
    {
      id: 'test2-e2',
      source: 'test2-summarize',
      target: 'test2-extract',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    },
    {
      id: 'test2-e3',
      source: 'test2-extract',
      target: 'test2-log',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    },
  ];
  return { nodes, edges };
}

// ══════════════════════════════════════════════════════
//  Inner canvas (needs ReactFlowProvider parent)
// ══════════════════════════════════════════════════════
function WorkflowCanvas({
  nodes, setNodes, onNodesChange,
  edges, setEdges, onEdgesChange,
  executingNodeIds,
  onNodeDoubleClick,
  contextMenu, setContextMenu,
  selectedNodeIds, setSelectedNodeIds,
  removeNodes,
  setRunPanelNode,
  openSettings,
}: {
  nodes: Node[];
  setNodes: (u: Node[] | ((p: Node[]) => Node[])) => void;
  onNodesChange: (c: any) => void;
  edges: Edge[];
  setEdges: (u: Edge[] | ((p: Edge[]) => Edge[])) => void;
  onEdgesChange: (c: any) => void;
  executingNodeIds: Set<string>;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  contextMenu: ContextMenuState;
  setContextMenu: (v: ContextMenuState) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  removeNodes: (ids: string[]) => void;
  setRunPanelNode: (v: RunPanelState) => void;
  openSettings: (nodeId: string, blockType: string, config: NodeConfig) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();

  // Mark executing nodes
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: { ...n.data, isExecuting: executingNodeIds.has(n.id) },
      })),
    );
  }, [executingNodeIds, setNodes]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  // Edge reconnection (detachable edges) - allows dragging edge endpoints to reconnect
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) =>
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/workflow-block');
      if (!raw) return;
      let tpl: WorkflowBlockTemplate;
      try { tpl = JSON.parse(raw); } catch { return; }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      nodeCounter++;
      const id = `wf-${Date.now()}-${nodeCounter}`;
      const newNode: Node = {
        id,
        type: 'workflow',
        position: { x: pos.x - 90, y: pos.y - 24 },
        data: {
          label: tpl.label,
          icon: tpl.icon,
          category: tpl.category,
          blockType: tpl.id,
          badgeLabel: BADGE_LABELS[tpl.category] ?? tpl.category.toUpperCase(),
          config: {},
          blockId: tpl.blockId,
        } satisfies Omit<WorkflowNodeData, 'onDelete' | 'onSettings'>,
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [screenToFlowPosition, setNodes],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ node, x: event.clientX, y: event.clientY });
    },
    [setContextMenu],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      setSelectedNodeIds(selected.map((n) => n.id));
    },
    [setSelectedNodeIds],
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

  const menuItems = (() => {
    if (!contextMenu) return [];
    const nodeData = contextMenu.node.data as unknown as WorkflowNodeData;
    const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [];
    if (nodeData.category === 'ai' && nodeData.blockId) {
      items.push(
        runBlockItem(() => {
          setRunPanelNode({
            id: contextMenu.node.id,
            data: {
              blockId: nodeData.blockId!,
              label: nodeData.label,
              icon: nodeData.icon,
            },
          });
          setContextMenu(null);
        }),
      );
    }
    items.push({
      label: 'Configure',
      icon: <Settings className="h-4 w-4" />,
      onClick: () => {
        openSettings(contextMenu.node.id, nodeData.blockType, nodeData.config);
        setContextMenu(null);
      },
    });
    items.push(
      removeNodeItem(() => {
        removeNodes([contextMenu.node.id]);
        setContextMenu(null);
      }),
    );
    return items;
  })();

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onSelectionChange={onSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        className="bg-zinc-950"
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
        }}
      >
        <Background color="#27272a" gap={16} size={1} />
        <Background color="#3f3f46" gap={80} size={1} />
        <Controls className="!bg-zinc-800 !border-zinc-700" />
        <MiniMap nodeColor="#3b82f6" maskColor="rgb(24,24,27,0.8)" className="!bg-zinc-900 !border-zinc-700" />
        <Panel position="top-center">
          <span className="text-zinc-500 text-xs">Drag from palette or click to add &bull; Right-click: Run / Configure / Remove &bull; Del to remove</span>
        </Panel>
        {nodes.length === 0 && (
          <Panel position="top-left" className="mt-24 ml-24 max-w-sm">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/90 p-4 text-zinc-400 text-sm shadow-lg">
              <p className="font-medium text-zinc-200">Workflow canvas is empty</p>
              <p className="mt-1">Add blocks from the palette on the left to start building your AI workflow.</p>
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

let nodeCounter = 0;

// ══════════════════════════════════════════════════════
//  Execution log panel
// ══════════════════════════════════════════════════════
function ExecutionLog({ entries }: { entries: string[] }) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries.length]);
  if (entries.length === 0) return null;
  return (
    <div className="border-t border-zinc-800 bg-zinc-900/90 max-h-48 overflow-y-auto text-xs font-mono text-zinc-400 px-4 py-2 space-y-0.5">
      {entries.map((e, i) => <div key={i}>{e}</div>)}
      <div ref={bottom} />
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Page
// ══════════════════════════════════════════════════════
export default function WorkflowsPage() {
  const [initial] = useState(() => loadWorkflow());
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [configModal, setConfigModal] = useState<{ nodeId: string; blockType: string; config: NodeConfig } | null>(null);
  const [executingNodeIds, setExecutingNodeIds] = useState<Set<string>>(new Set());
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [runPanelNode, setRunPanelNode] = useState<RunPanelState>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const clearRunCache = useFlowRunStore((s) => s.clearAll);
  const executionLogAdd = useExecutionLog((s) => s.add);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Undo/Redo history ──
  type HistoryState = { nodes: Node[]; edges: Edge[] };
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const isUndoingRef = useRef(false);

  const takeSnapshot = useCallback(() => {
    if (isUndoingRef.current) return;
    const cleanNodes = nodes.map((n) => {
      const { onDelete, onSettings, ...rest } = (n.data ?? {}) as unknown as WorkflowNodeData;
      return { ...n, data: rest };
    });
    setHistory((prev) => [...prev.slice(-49), { nodes: cleanNodes, edges }]);
    setFuture([]);
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    isUndoingRef.current = true;
    const prev = history[history.length - 1];
    const cleanNodes = nodes.map((n) => {
      const { onDelete, onSettings, ...rest } = (n.data ?? {}) as unknown as WorkflowNodeData;
      return { ...n, data: rest };
    });
    setFuture((f) => [...f, { nodes: cleanNodes, edges }]);
    setHistory((h) => h.slice(0, -1));
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setTimeout(() => { isUndoingRef.current = false; }, 100);
  }, [history, nodes, edges, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    isUndoingRef.current = true;
    const next = future[future.length - 1];
    const cleanNodes = nodes.map((n) => {
      const { onDelete, onSettings, ...rest } = (n.data ?? {}) as unknown as WorkflowNodeData;
      return { ...n, data: rest };
    });
    setHistory((h) => [...h, { nodes: cleanNodes, edges }]);
    setFuture((f) => f.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
    setTimeout(() => { isUndoingRef.current = false; }, 100);
  }, [future, nodes, edges, setNodes, setEdges]);

  // ── Persist on changes ──
  useEffect(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      try {
        // Strip callbacks before serialising
        const clean = nodes.map((n) => {
          const { onDelete, onSettings, ...rest } = (n.data ?? {}) as unknown as WorkflowNodeData;
          return { ...n, data: rest };
        });
        localStorage.setItem(WF_STORAGE_KEY, JSON.stringify({ nodes: clean, edges }));
      } catch { /* ignore */ }
    }, 400);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [nodes, edges]);

  // ── Inject callbacks into nodes loaded from storage ──
  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const removeNodes = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
    setEdges((prev) => prev.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)));
    setRunPanelNode((prev) => (prev && idSet.has(prev.id) ? null : prev));
  }, [setNodes, setEdges]);

  const openSettings = useCallback((nodeId: string, blockType: string, config: NodeConfig) => {
    setConfigModal({ nodeId, blockType, config });
  }, []);

  // Ensure callbacks are always present (needed after hydrating from localStorage)
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const d = n.data as unknown as WorkflowNodeData;
        if (d.onDelete && d.onSettings) return n;
        return { ...n, data: { ...d, onDelete: deleteNode, onSettings: openSettings } };
      }),
    );
  }, [deleteNode, openSettings, setNodes]);

  // ── Subscribe to execution updates ──
  useEffect(() => {
    const unsub = workflowEngine.onUpdate((exec: WorkflowExecution) => {
      setExecutingNodeIds(new Set(exec.activeNodes));
      const ts = new Date(exec.timestamp).toLocaleTimeString();

      // Log loop iterations
      if (exec.loopInfo) {
        const { iteration, maxIterations, nodes: loopNodes } = exec.loopInfo;
        const nodeList = loopNodes?.join(', ') || 'cycle';
        setLogEntries((prev) => [...prev, `[${ts}] 🔄 Loop iteration ${iteration}/${maxIterations} (${nodeList})`]);
      }

      // Log block outputs and update node I/O display
      if (exec.lastOutput) {
        const { blockId, name, outputs } = exec.lastOutput;
        const outputStr = outputs ? JSON.stringify(outputs).slice(0, 100) : '';
        const truncated = outputStr.length >= 100 ? outputStr + '...' : outputStr;
        setLogEntries((prev) => [...prev, `[${ts}] ✅ ${name || 'Block'}: ${truncated}`]);

        // Also add to execution log panel for audio display
        if (blockId && outputs) {
          executionLogAdd({
            blockName: name || 'Block',
            blockId,
            success: true,
            output: outputs,
          });
        }

        // Extract text value for display on node
        const textValue = outputs?.text || outputs?.summary || outputs?.emails || outputs?.label || '';
        const displayText = typeof textValue === 'string' ? textValue : JSON.stringify(textValue);

        // For audio blocks, preserve the full audioBase64 data
        const audioData = outputs?.audioBase64 || '';

        // Update the node's output
        if (blockId) {
          setNodes((prev) => prev.map((n) => {
            if (n.id === blockId) {
              return { ...n, data: { ...(n.data as unknown as WorkflowNodeData), output: displayText, audioBase64: audioData } };
            }
            return n;
          }));

          // Find downstream nodes and set their input
          setNodes((prev) => {
            const outgoingEdges = edges.filter((e) => e.source === blockId);
            const downstreamIds = new Set(outgoingEdges.map((e) => e.target));
            return prev.map((n) => {
              if (downstreamIds.has(n.id)) {
                // Pass both text and audio data to downstream nodes
                return { ...n, data: { ...(n.data as unknown as WorkflowNodeData), input: displayText, audioBase64: audioData } };
              }
              return n;
            });
          });
        }
      }

      // Log errors
      if (exec.error) {
        setLogEntries((prev) => [...prev, `[${ts}] ❌ Error: ${exec.error}`]);
        // Also add to execution log panel
        if (exec.lastOutput?.blockId) {
          executionLogAdd({
            blockName: exec.lastOutput.name || 'Block',
            blockId: exec.lastOutput.blockId,
            success: false,
            error: exec.error,
          });
        }
      }

      // Log status changes
      if (exec.status === 'running' && exec.activeNodes.length > 0 && !exec.loopInfo && !exec.lastOutput) {
        setLogEntries((prev) => [...prev, `[${ts}] Executing: ${exec.activeNodes.join(', ')}`]);
      } else if (exec.status !== 'running') {
        setLogEntries((prev) => [...prev, `[${ts}] Workflow ${exec.status}`]);
      }
    });
    return unsub;
  }, []);

  // ── Add from palette ──
  const handlePaletteAdd = useCallback(
    (tpl: WorkflowBlockTemplate) => {
      nodeCounter++;
      const id = `wf-${Date.now()}-${nodeCounter}`;
      const x = 200 + Math.random() * 300;
      const y = 100 + Math.random() * 200;
      const newNode: Node = {
        id,
        type: 'workflow',
        position: { x, y },
        data: {
          label: tpl.label,
          icon: tpl.icon,
          category: tpl.category,
          blockType: tpl.id,
          badgeLabel: BADGE_LABELS[tpl.category] ?? tpl.category.toUpperCase(),
          config: {},
          blockId: tpl.blockId,
          onDelete: deleteNode,
          onSettings: openSettings,
        } satisfies WorkflowNodeData,
      };
      takeSnapshot();
      setNodes((prev) => [...prev, newNode]);
    },
    [setNodes, deleteNode, openSettings, nodes.length, takeSnapshot],
  );

  // ── Config save ──
  const handleConfigSave = useCallback(
    (config: NodeConfig) => {
      if (!configModal) return;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === configModal.nodeId
            ? { ...n, data: { ...n.data, config } }
            : n,
        ),
      );
      setConfigModal(null);
    },
    [configModal, setNodes],
  );

  // ── Run workflow ──
  const handleRun = useCallback(async () => {
    // Find the first trigger node
    const trigger = nodes.find((n) => (n.data as unknown as WorkflowNodeData).category === 'trigger');
    if (!trigger) {
      setLogEntries((prev) => [...prev, `[${new Date().toLocaleTimeString()}] No trigger node found — add a Trigger block first.`]);
      setShowLog(true);
      return;
    }
    setIsRunning(true);
    setShowLog(true);
    setLogEntries((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Starting workflow from "${(trigger.data as unknown as WorkflowNodeData).label}"…`]);
    try {
      // Try server-side streaming execution first
      try {
        setLogEntries((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Using server-side execution…`]);
        await workflowEngine.runServerSide(nodes, edges, trigger.id);
      } catch (serverErr) {
        // Fall back to client-side execution
        console.warn('Server-side execution failed, falling back to client-side:', serverErr);
        setLogEntries((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Server unavailable — falling back to client-side execution…`]);
        await workflowEngine.run(nodes, edges, trigger.id);
      }
    } finally {
      setIsRunning(false);
      setExecutingNodeIds(new Set());
    }
  }, [nodes, edges]);

  // ── Clear canvas ──
  const handleClear = useCallback(() => {
    takeSnapshot();
    setNodes([]);
    setEdges([]);
    setLogEntries([]);
  }, [setNodes, setEdges, takeSnapshot]);

  // ── Edge reconnection (detachable edges) ──
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      takeSnapshot();
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges, takeSnapshot],
  );

  const handleRunSelected = useCallback(() => {
    if (selectedNodeIds.length !== 1) return;
    const node = nodes.find((n) => n.id === selectedNodeIds[0]);
    if (!node?.data) return;
    const nodeData = node.data as unknown as WorkflowNodeData;
    setRunPanelNode({
      id: node.id,
      data: {
        blockId: nodeData.blockId ?? '',
        label: nodeData.label,
        icon: nodeData.icon,
      },
    });
  }, [selectedNodeIds, nodes]);

  const handlePrepopulate = useCallback((testNum: 1 | 2) => {
    const { nodes: prepNodes, edges: prepEdges } = testNum === 1 ? getTestWorkflow1() : getTestWorkflow2();
    setNodes(prepNodes);
    setEdges(prepEdges);
    setRunPanelNode(null);
    setSelectedNodeIds([]);
    setLogEntries([]);
    clearRunCache();
  }, [setNodes, setEdges, clearRunCache]);

  // ── Auto-layout (BFS layered) ──
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const incoming = new Set(edges.map((e) => e.target));
    const roots = nodes.filter((n) => !incoming.has(n.id));
    const layers: string[][] = [];
    const assigned = new Set<string>();
    let current = roots.length ? roots.map((n) => n.id) : [nodes[0].id];
    let layer = 0;
    while (current.length && layer < 20) {
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
    if (remaining.length) layers.push(remaining);
    setNodes((prev) =>
      prev.map((node) => {
        for (let i = 0; i < layers.length; i++) {
          const idx = layers[i].indexOf(node.id);
          if (idx >= 0) return { ...node, position: { x: 80 + i * 280, y: 80 + idx * 120 } };
        }
        return node;
      }),
    );
  }, [nodes, edges, setNodes]);

  // ── Export / Import ──
  const handleExport = useCallback(() => {
    const clean = nodes.map((n) => {
      const { onDelete, onSettings, ...rest } = (n.data ?? {}) as unknown as WorkflowNodeData;
      return { ...n, data: rest };
    });
    const blob = new Blob([JSON.stringify({ nodes: clean, edges, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [nodes, edges]);

  const fileRef = useRef<HTMLInputElement>(null);
  const handleImport = useCallback(() => fileRef.current?.click(), []);
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as { nodes?: Node[]; edges?: Edge[] };
        if (Array.isArray(json.nodes)) setNodes(json.nodes);
        if (Array.isArray(json.edges)) setEdges(json.edges);
      } catch {
        window.alert('Invalid workflow file.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);

  // ── Double-click to open settings ──
  const handleDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as WorkflowNodeData;
    openSettings(node.id, data.blockType, data.config);
  }, [openSettings]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80 shrink-0 flex-wrap">
        <Link href="/" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
          <Home className="h-4 w-4" /> Home
        </Link>

        <div className="h-5 w-px bg-zinc-700" />

        <button onClick={handleUndo} disabled={history.length === 0} title="Undo (⌘Z)" className="rounded-lg bg-zinc-700 px-2 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 flex items-center gap-1">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleRedo} disabled={future.length === 0} title="Redo (⌘⇧Z)" className="rounded-lg bg-zinc-700 px-2 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 flex items-center gap-1">
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px bg-zinc-700" />

        <button onClick={handleRun} disabled={nodes.length === 0 || isRunning} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed">
          <Play className="h-3.5 w-3.5" />
          {isRunning ? 'Running…' : 'Run Workflow'}
        </button>

        <button
          onClick={handleRunSelected}
          disabled={selectedNodeIds.length !== 1}
          className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 flex items-center gap-1.5"
        >
          Run selected
        </button>

        <button onClick={handleClear} className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 flex items-center gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>

        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val === '1') handlePrepopulate(1);
            else if (val === '2') handlePrepopulate(2);
            e.target.value = '';
          }}
          className="rounded-lg bg-amber-600/80 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-amber-500/80 cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>Load Test...</option>
          <option value="1">Test 1: Feedback Loop</option>
          <option value="2">Test 2: Linear Flow</option>
        </select>

        <button onClick={handleAutoLayout} disabled={nodes.length === 0} className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" /> Auto-layout
        </button>

        <button onClick={() => setShowLog(!showLog)} className={`rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-zinc-600 flex items-center gap-1.5 ${showLog ? 'bg-zinc-600 text-white' : 'bg-zinc-700 text-zinc-200'}`}>
          <ScrollText className="h-3.5 w-3.5" /> Logs
        </button>

        <button onClick={handleExport} className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <button onClick={handleImport} className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Import
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />

        <span className="text-zinc-500 text-xs ml-auto">
          {nodes.length} block{nodes.length !== 1 ? 's' : ''} &bull; {edges.length} connection{edges.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Main body ── */}
      <div className="flex-1 flex min-h-0">
        <WorkflowPalette onAdd={handlePaletteAdd} />
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-h-0">
            <ReactFlowProvider>
              <WorkflowCanvas
                nodes={nodes}
                setNodes={setNodes}
                onNodesChange={onNodesChange}
                edges={edges}
                setEdges={setEdges}
                onEdgesChange={onEdgesChange}
                executingNodeIds={executingNodeIds}
                onNodeDoubleClick={handleDoubleClick}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                selectedNodeIds={selectedNodeIds}
                setSelectedNodeIds={setSelectedNodeIds}
                removeNodes={removeNodes}
                setRunPanelNode={setRunPanelNode}
                openSettings={openSettings}
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

      {/* ── Log panel ── */}
      {showLog && <ExecutionLog entries={logEntries} />}

      {/* ── Config modal ── */}
      {configModal && (
        <ConfigModalRouter
          blockType={configModal.blockType}
          config={configModal.config}
          onSave={handleConfigSave}
          onClose={() => setConfigModal(null)}
        />
      )}
    </div>
  );
}
