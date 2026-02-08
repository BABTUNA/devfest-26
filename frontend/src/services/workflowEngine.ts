/**
 * Workflow execution engine (adapted from surveilens BFS engine).
 *
 * Differences from surveilens:
 *  - No surveillance events — instead executes AI blocks via /api/run-block.
 *  - Trigger nodes produce an initial payload (manual text, uploaded file path, etc.).
 *  - AI nodes call the backend and pass output downstream.
 *  - Conditions inspect the latest payload and pass/fail.
 *  - Action nodes (webhook, email, log, save) do side-effects.
 */

import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowExecution } from '@/types/workflowTypes';
import { getBlockById, type BlockId } from 'shared';

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
  : 'http://localhost:4000';

// ── Payload flowing through the graph ──
type Payload = Record<string, unknown>;

class WorkflowEngine {
  private callbacks: ((exec: WorkflowExecution) => void)[] = [];

  /** Subscribe to execution state updates (returns unsubscribe fn). */
  onUpdate(cb: (exec: WorkflowExecution) => void): () => void {
    this.callbacks.push(cb);
    return () => {
      const idx = this.callbacks.indexOf(cb);
      if (idx > -1) this.callbacks.splice(idx, 1);
    };
  }

  private notify(exec: WorkflowExecution) {
    this.callbacks.forEach((cb) => cb(exec));
  }

  // ══════════════════════════════════════════════════════
  //  Run (cycle-aware)
  // ══════════════════════════════════════════════════════
  async run(nodes: Node[], edges: Edge[], triggerNodeId: string): Promise<void> {
    const exec: WorkflowExecution = {
      workflowId: `wf-${Date.now()}`,
      triggeredBy: triggerNodeId,
      timestamp: Date.now(),
      status: 'running',
      activeNodes: [triggerNodeId],
    };
    this.notify(exec);

    // Payload cache: nodeId → output
    const payloads = new Map<string, Payload>();

    try {
      // Build the trigger's initial payload
      const triggerNode = nodes.find((n) => n.id === triggerNodeId);
      if (!triggerNode) throw new Error('Trigger node not found');
      const triggerData = triggerNode.data as unknown as WorkflowNodeData;
      const triggerPayload: Payload = {
        trigger: true,
        text: (triggerData.config?.text as string) ?? '',
        value: (triggerData.config?.value as string) ?? '',
      };
      payloads.set(triggerNodeId, triggerPayload);

      // Build execution plan: topological order of condensed SCC graph
      const plan = buildExecutionPlan(triggerNodeId, nodes, edges);

      for (const step of plan) {
        if (step.type === 'single') {
          // Single node — execute once
          const node = step.node;
          const data = node.data as unknown as WorkflowNodeData;
          exec.activeNodes = [node.id];
          this.notify(exec);
          await sleep(250);

          const upstreamPayload = this.mergeUpstream(node.id, edges, payloads);
          const output = await this.executeNode(data, upstreamPayload);
          payloads.set(node.id, output);

          // Condition failure stops workflow
          if (data.category === 'condition') {
            // executeNode throws on failure; if we got here, it passed
          }

          await sleep(300);
        } else {
          // Cycle group — execute iteratively
          const maxIter = step.maxIterations;
          let iteration = 0;
          let cycleExited = false;

          while (iteration < maxIter && !cycleExited) {
            iteration++;
            exec.activeNodes = step.nodes.map((n) => n.id);
            this.notify(exec);
            await sleep(250);

            for (const node of step.nodes) {
              const data = node.data as unknown as WorkflowNodeData;
              const upstreamPayload = this.mergeUpstream(node.id, edges, payloads);

              try {
                const output = await this.executeNode(data, upstreamPayload);
                payloads.set(node.id, output);
              } catch (err) {
                // Condition failure inside a loop = exit the loop
                if (data.category === 'condition') {
                  cycleExited = true;
                  break;
                }
                throw err;
              }
            }

            // Check convergence: did the entry node's output change?
            if (!cycleExited && iteration > 1) {
              const entryId = step.nodes[0].id;
              const prev = step.prevPayload;
              const curr = payloads.get(entryId);
              if (prev && curr && JSON.stringify(prev) === JSON.stringify(curr)) {
                cycleExited = true;
              }
            }
            // Save payload snapshot for convergence check
            step.prevPayload = { ...payloads.get(step.nodes[0].id) };

            await sleep(300);
          }
        }
      }

      exec.status = 'completed';
      exec.activeNodes = [];
      this.notify(exec);
    } catch (err) {
      console.error('Workflow failed', err);
      exec.status = 'failed';
      exec.activeNodes = [];
      this.notify(exec);
    }
  }

  /** Merge all upstream payloads for a given node. */
  private mergeUpstream(nodeId: string, edges: Edge[], payloads: Map<string, Payload>): Payload {
    const upstreamEdges = edges.filter((e) => e.target === nodeId);
    const merged: Payload = {};
    for (const ue of upstreamEdges) {
      Object.assign(merged, payloads.get(ue.source) ?? {});
    }
    return merged;
  }

  // ══════════════════════════════════════════════════════
  //  Build inputs for a block using its definition
  // ══════════════════════════════════════════════════════
  private buildBlockInputs(
    blockId: string,
    cfg: Record<string, unknown>,
    upstream: Payload,
  ): Record<string, string | string[]> {
    const block = getBlockById(blockId as BlockId);
    const inputs: Record<string, string | string[]> = {};

    if (!block) {
      // Fallback: pass upstream text
      const text = String(cfg.text ?? upstream.text ?? upstream.value ?? '');
      return { text, value: text };
    }

    // Resolve the "primary text" from upstream — the first non-metadata value
    const primaryUpstream = String(
      upstream.text ?? upstream.value ?? Object.values(upstream).find((v) => v !== true && v !== undefined) ?? '',
    );

    for (const inp of block.inputs) {
      const key = inp.key;

      // 1. Check node config first (user-set value in modal)
      if (cfg[key] !== undefined && cfg[key] !== '') {
        if (inp.type === 'file' && Array.isArray(cfg[key])) {
          inputs[key] = cfg[key] as string[];
        } else {
          inputs[key] = String(cfg[key]);
        }
        continue;
      }

      // 2. Check upstream payload for exact key match
      if (upstream[key] !== undefined && upstream[key] !== '') {
        if (inp.type === 'file' && Array.isArray(upstream[key])) {
          inputs[key] = upstream[key] as string[];
        } else {
          inputs[key] = String(upstream[key]);
        }
        continue;
      }

      // 3. For primary text-like inputs, use the primary upstream value
      if (key === 'text' || key === 'text1' || key === 'value' || key === 'message' || key === 'url') {
        inputs[key] = primaryUpstream;
        continue;
      }

      // 4. Fall back to empty string
      inputs[key] = '';
    }

    return inputs;
  }

  // ══════════════════════════════════════════════════════
  //  Execute a single node
  // ══════════════════════════════════════════════════════
  private async executeNode(data: WorkflowNodeData, upstream: Payload): Promise<Payload> {
    const bt = data.blockType;
    const cfg = data.config ?? {};

    // ── Blocks with a blockId → call backend via /api/run-block ──
    if (data.blockId) {
      const inputs = this.buildBlockInputs(data.blockId, cfg, upstream);

      // Special handling for audio-player block
      if (data.blockId === 'audio-player') {
        // Get audio from multiple sources: inputs, upstream, or node data
        const audioBase64 = String(inputs.audioBase64 ?? upstream.audioBase64 ?? data.audioBase64 ?? '');
        const volume = Number(cfg.volume ?? 100) / 100;
        const autoPlay = (cfg.autoPlay as boolean) ?? true;
        const showPlayer = (cfg.showPlayer as boolean) ?? true;

        console.log('[Audio Player] Processing audio:', {
          hasAudio: !!audioBase64,
          audioLength: audioBase64.length,
          autoPlay,
          volume
        });

        if (!audioBase64 || audioBase64.length < 100) {
          console.warn('[Audio Player] No valid audio data received');
          return {
            audioBase64: '',
            played: false,
            error: 'No audio data received',
            volume: cfg.volume ?? 100,
            showPlayer
          };
        }

        if (typeof window !== 'undefined') {
          try {
            // Remove any existing audio player
            const existingPlayer = document.getElementById('workflow-audio-player');
            if (existingPlayer) {
              existingPlayer.remove();
            }

            // Create persistent audio element with controls
            const audio = document.createElement('audio');
            audio.id = 'workflow-audio-player';
            audio.controls = showPlayer;
            audio.volume = volume;
            audio.src = `data:audio/mpeg;base64,${audioBase64}`;
            audio.style.position = 'fixed';
            audio.style.bottom = '20px';
            audio.style.right = '20px';
            audio.style.zIndex = '9999';
            audio.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            audio.style.borderRadius = '8px';
            audio.style.padding = '10px';

            document.body.appendChild(audio);

            console.log('[Audio Player] Created audio element with', audioBase64.length, 'bytes');

            // Attempt autoplay
            if (autoPlay) {
              audio.play()
                .then(() => console.log('[Audio Player] ✓ Successfully playing audio'))
                .catch((err) => {
                  console.warn('[Audio Player] Autoplay failed:', err.message);
                  console.warn('[Audio Player] Click the play button to hear audio');
                });
            }
          } catch (err) {
            console.error('[Audio Player] Failed to create audio element:', err);
          }
        }

        return {
          audioBase64,
          played: true,
          volume: cfg.volume ?? 100,
          showPlayer
        };
      }

      const res = await fetch(`${API_URL}/api/run-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': 'demo-user-1' },
        body: JSON.stringify({ blockId: data.blockId, inputs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Block ${data.blockId} failed`);
      // Normalize: expose primary content as `text` for downstream
      // Priority: text > body > content > first value
      const outputs = json.outputs ?? {};
      const textValue = outputs.text ?? outputs.body ?? outputs.content ?? Object.values(outputs)[0] ?? '';
      return { ...outputs, text: String(textValue) };
    }

    // ── Conditions ──
    if (data.category === 'condition') {
      const text = String(upstream.text ?? upstream.value ?? '');
      if (bt === 'text_contains') {
        const pattern = (cfg.pattern as string) ?? '';
        const cs = cfg.caseSensitive as boolean;
        const match = cs ? text.includes(pattern) : text.toLowerCase().includes(pattern.toLowerCase());
        if (!match) throw new Error('Condition failed: text does not contain pattern');
        return upstream;
      }
      if (bt === 'text_not_empty') {
        if (!text.trim()) throw new Error('Condition failed: text is empty');
        return upstream;
      }
      if (bt === 'confidence_check') {
        let conf = Number(upstream.confidence ?? 100);
        // Normalize 0-1 scale to percentage if needed
        if (conf > 0 && conf <= 1) conf = conf * 100;
        const threshold = (cfg.threshold as number) ?? 70;
        if (conf < threshold) throw new Error(`Condition failed: confidence ${conf.toFixed(0)}% < ${threshold}%`);
        return upstream;
      }
      return upstream;
    }

    // ── Actions ──
    if (data.category === 'action') {
      if (bt === 'log_output') {
        console.log('[Workflow Log]', upstream);
        return upstream;
      }
      if (bt === 'webhook') {
        const url = (cfg.url as string) ?? '';
        const method = (cfg.method as string) ?? 'POST';
        if (url) {
          try {
            await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(upstream),
            });
          } catch (e) {
            console.warn('Webhook failed', e);
          }
        }
        return upstream;
      }
      if (bt === 'save_result') {
        console.log('[Save Result]', upstream);
        return upstream;
      }
      if (bt === 'send_email') {
        console.log('[Send Email]', { to: cfg.to, subject: cfg.subject, body: cfg.body, payload: upstream });
        return upstream;
      }
      return upstream;
    }

    // ── Triggers (already resolved before BFS) ──
    return upstream;
  }

  // ══════════════════════════════════════════════════════
  //  Server-side streaming execution
  // ══════════════════════════════════════════════════════
  async runServerSide(nodes: Node[], edges: Edge[], triggerNodeId: string): Promise<void> {
    const exec: WorkflowExecution = {
      workflowId: `wf-${Date.now()}`,
      triggeredBy: triggerNodeId,
      timestamp: Date.now(),
      status: 'running',
      activeNodes: [triggerNodeId],
    };
    this.notify(exec);

    // Strip non-serialisable callbacks from node data before sending
    const cleanNodes = nodes.map((n) => {
      const { onDelete, onSettings, ...rest } = (n.data ?? {}) as Record<string, unknown>;
      return { id: n.id, data: rest };
    });
    const cleanEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));

    const res = await fetch(`${API_URL}/api/run-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': 'demo-user-1' },
      body: JSON.stringify({ nodes: cleanNodes, edges: cleanEdges, triggerNodeId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error ?? `Server returned ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed) as Record<string, unknown>;
          this.handleStreamEvent(event, exec);
        } catch {
          // skip malformed lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim()) as Record<string, unknown>;
        this.handleStreamEvent(event, exec);
      } catch {
        // skip
      }
    }

    // Ensure we end in a terminal state
    if (exec.status === 'running') {
      exec.status = 'completed';
      exec.activeNodes = [];
      this.notify(exec);
    }
  }

  private handleStreamEvent(event: Record<string, unknown>, exec: WorkflowExecution) {
    const type = event.type as string;
    const blockId = event.blockId as string | undefined;

    if (type === 'start' && blockId) {
      if (!exec.activeNodes.includes(blockId)) {
        exec.activeNodes = [...exec.activeNodes, blockId];
      }
      exec.timestamp = Date.now();
      this.notify({ ...exec });
    } else if (type === 'progress' && blockId) {
      // Store the output data for logging
      const outputs = event.outputs as Record<string, unknown> | undefined;
      const name = event.name as string | undefined;

      // Debug: Log audioBase64 length if present
      if (outputs?.audioBase64) {
        const audioLength = typeof outputs.audioBase64 === 'string' ? outputs.audioBase64.length : 0;
        console.log(`[Stream Event] Received audioBase64 for ${blockId}:`, {
          audioLength,
          audioPreview: typeof outputs.audioBase64 === 'string' ? outputs.audioBase64.substring(0, 50) : 'not a string'
        });
      }

      exec.activeNodes = exec.activeNodes.filter((id) => id !== blockId);
      exec.timestamp = Date.now();
      exec.lastOutput = { blockId, name, outputs }; // Add output info
      this.notify({ ...exec });
    } else if (type === 'loop_iteration') {
      const iteration = event.iteration as number;
      const maxIterations = event.maxIterations as number;
      const nodes = event.nodes as string[] | undefined;
      exec.timestamp = Date.now();
      exec.loopInfo = { iteration, maxIterations, nodes }; // Add loop info
      this.notify({ ...exec });
    } else if (type === 'error' && blockId) {
      const errorMsg = event.error as string | undefined;
      exec.activeNodes = exec.activeNodes.filter((id) => id !== blockId);
      exec.timestamp = Date.now();
      exec.error = errorMsg;
      this.notify({ ...exec });
    } else if (type === 'complete') {
      const status = (event.status as string) ?? 'completed';
      exec.status = status === 'failed' ? 'failed' : 'completed';
      exec.activeNodes = [];
      this.notify({ ...exec });
    }
  }

}

// ══════════════════════════════════════════════════════
//  Cycle-aware graph utilities
// ══════════════════════════════════════════════════════

const DEFAULT_MAX_ITERATIONS = 10;

type ExecutionStep =
  | { type: 'single'; node: Node }
  | { type: 'cycle'; nodes: Node[]; maxIterations: number; prevPayload?: Payload };

/**
 * Tarjan's SCC algorithm — returns SCCs in reverse topological order.
 * Each SCC is an array of node IDs.
 */
function tarjanSCC(nodeIds: string[], adj: Map<string, string[]>): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const sccs: string[][] = [];

  function strongconnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (!indices.has(w)) {
        strongconnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const id of nodeIds) {
    if (!indices.has(id)) strongconnect(id);
  }

  return sccs;
}

/**
 * Build an execution plan from a trigger node.
 * Uses Tarjan's SCC to find cycles, then produces a topological
 * ordering of the condensed DAG.
 */
function buildExecutionPlan(
  triggerId: string,
  nodes: Node[],
  edges: Edge[],
): ExecutionStep[] {
  // Build adjacency list (only for nodes reachable from trigger)
  const reachable = new Set<string>();
  const queue = [triggerId];
  const adj = new Map<string, string[]>();

  // BFS to find all reachable nodes (follow edges, allow revisits for cycle detection)
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    const neighbors: string[] = [];
    for (const e of edges) {
      if (e.source === cur) {
        neighbors.push(e.target);
        queue.push(e.target);
      }
    }
    adj.set(cur, neighbors);
  }

  const reachableIds = Array.from(reachable);

  // Run Tarjan's SCC (returns in reverse topological order)
  const sccs = tarjanSCC(reachableIds, adj);

  // Map nodeId → SCC index
  const nodeToScc = new Map<string, number>();
  for (let i = 0; i < sccs.length; i++) {
    for (const nid of sccs[i]) nodeToScc.set(nid, i);
  }

  // Build condensed DAG adjacency
  const sccAdj = new Map<number, Set<number>>();
  for (let i = 0; i < sccs.length; i++) sccAdj.set(i, new Set());
  for (const e of edges) {
    const s = nodeToScc.get(e.source);
    const t = nodeToScc.get(e.target);
    if (s !== undefined && t !== undefined && s !== t) {
      sccAdj.get(s)!.add(t);
    }
  }

  // Topological sort of the condensed DAG (Kahn's algorithm)
  const inDegree = new Map<number, number>();
  for (let i = 0; i < sccs.length; i++) inDegree.set(i, 0);
  for (const [, targets] of sccAdj) {
    for (const t of targets) inDegree.set(t, (inDegree.get(t) ?? 0) + 1);
  }
  const topoQueue: number[] = [];
  for (const [i, deg] of inDegree) {
    if (deg === 0) topoQueue.push(i);
  }
  const topoOrder: number[] = [];
  while (topoQueue.length > 0) {
    const cur = topoQueue.shift()!;
    topoOrder.push(cur);
    for (const next of sccAdj.get(cur) ?? []) {
      const nd = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nd);
      if (nd === 0) topoQueue.push(next);
    }
  }

  // Build execution steps from topological order
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const plan: ExecutionStep[] = [];

  for (const sccIdx of topoOrder) {
    const scc = sccs[sccIdx];
    if (scc.length === 1) {
      const nodeId = scc[0];
      // Check if it's a self-loop
      const selfLoop = edges.some((e) => e.source === nodeId && e.target === nodeId);
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      if (selfLoop) {
        const data = node.data as unknown as WorkflowNodeData;
        const maxIter = (data.config?.maxIterations as number) || DEFAULT_MAX_ITERATIONS;
        plan.push({ type: 'cycle', nodes: [node], maxIterations: maxIter });
      } else {
        plan.push({ type: 'single', node });
      }
    } else {
      // Multi-node cycle: order nodes within the SCC by following edges
      const sccSet = new Set(scc);
      const ordered: Node[] = [];
      const visited = new Set<string>();

      // Start from the node with an external incoming edge (entry point)
      let entryId = scc.find((nid) =>
        edges.some((e) => e.target === nid && !sccSet.has(e.source)),
      ) ?? scc[0];

      const dfsOrder = (id: string) => {
        if (visited.has(id) || !sccSet.has(id)) return;
        visited.add(id);
        const node = nodeMap.get(id);
        if (node) ordered.push(node);
        for (const e of edges) {
          if (e.source === id && sccSet.has(e.target)) dfsOrder(e.target);
        }
      };
      dfsOrder(entryId);

      // Add any unvisited SCC members
      for (const nid of scc) {
        if (!visited.has(nid)) {
          const node = nodeMap.get(nid);
          if (node) ordered.push(node);
        }
      }

      // Determine max iterations from any node in the cycle
      let maxIter = DEFAULT_MAX_ITERATIONS;
      for (const node of ordered) {
        const data = node.data as unknown as WorkflowNodeData;
        const configured = data.config?.maxIterations as number | undefined;
        if (configured && configured > 0) {
          maxIter = configured;
          break;
        }
      }

      plan.push({ type: 'cycle', nodes: ordered, maxIterations: maxIter });
    }
  }

  // Filter out the trigger node from execution (it's already resolved)
  return plan.filter((step) => {
    if (step.type === 'single') return step.node.id !== triggerId;
    step.nodes = step.nodes.filter((n) => n.id !== triggerId);
    return step.nodes.length > 0;
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const workflowEngine = new WorkflowEngine();
