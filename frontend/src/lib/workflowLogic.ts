import type { Node, Edge } from '@xyflow/react';

export type InputSource =
  | { type: 'connected'; sourceNodeId: string; sourceHandle: string; sourceLabel: string }
  | { type: 'manual' };

/**
 * For a given node and input key, determine if the input is wired from another node's output.
 */
export function getInputSource(
  nodeId: string,
  inputKey: string,
  edges: Edge[],
  nodes: Node[]
): InputSource {
  const edge = edges.find((e) => e.target === nodeId && (e.targetHandle ?? null) === inputKey);
  if (!edge) return { type: 'manual' };
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const sourceLabel = sourceNode?.data?.label ?? edge.source;
  return {
    type: 'connected',
    sourceNodeId: edge.source,
    sourceHandle: (edge.sourceHandle as string) ?? '',
    sourceLabel: String(sourceLabel),
  };
}

/**
 * Returns node IDs that have at least one edge (incoming or outgoing).
 * Only these nodes can be run as part of the workflow.
 */
export function getConnectedNodeIds(nodes: Node[], edges: Edge[]): Set<string> {
  const connected = new Set<string>();
  edges.forEach((e) => {
    if (nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target)) {
      connected.add(e.source);
      connected.add(e.target);
    }
  });
  return connected;
}

/**
 * Topological order of node ids (roots first). Returns null if cycle detected.
 */
export function topologicalOrder(nodes: Node[], edges: Edge[]): string[] | null {
  const idSet = new Set(nodes.map((n) => n.id));
  const incoming = new Map<string, Set<string>>();
  idSet.forEach((id) => incoming.set(id, new Set()));
  edges.forEach((e) => {
    if (idSet.has(e.target) && idSet.has(e.source) && e.source !== e.target) {
      incoming.get(e.target)!.add(e.source);
    }
  });
  const order: string[] = [];
  const done = new Set<string>();
  let progress = true;
  while (progress && order.length < nodes.length) {
    progress = false;
    for (const id of idSet) {
      if (done.has(id)) continue;
      const deps = incoming.get(id)!;
      const ready = [...deps].every((d) => done.has(d));
      if (ready) {
        order.push(id);
        done.add(id);
        progress = true;
      }
    }
  }
  if (order.length !== nodes.length) return null; // cycle
  return order;
}

export type EntryInputSpec = { key: string; label: string };

/**
 * Collect (nodeId, inputKey, label) for every input that has no incoming edge.
 * getInputs(nodeId) returns the list of input keys and labels for that node (e.g. from block definition).
 */
export function getEntryInputs(
  nodes: Node[],
  edges: Edge[],
  getInputs: (nodeId: string) => EntryInputSpec[]
): { nodeId: string; nodeLabel: string; inputKey: string; label: string }[] {
  const out: { nodeId: string; nodeLabel: string; inputKey: string; label: string }[] = [];
  nodes.forEach((node) => {
    const inputs = getInputs(node.id);
    inputs.forEach(({ key: inputKey, label: inputLabel }) => {
      const src = getInputSource(node.id, inputKey, edges, nodes);
      if (src.type === 'manual') {
        const nodeLabel = (node.data?.label as string) ?? node.id;
        out.push({
          nodeId: node.id,
          nodeLabel,
          inputKey,
          label: `${nodeLabel}: ${inputLabel}`,
        });
      }
    });
  });
  return out;
}
