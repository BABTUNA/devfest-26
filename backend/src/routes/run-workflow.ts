import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId } from '../lib/auth.js';
import { getBlockById, type BlockId } from 'shared';
import { runBlock } from '../services/run-block.js';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export const runWorkflowRouter = Router();

// ── Types mirroring the frontend WorkflowNodeData shape ──

interface WFNodeData {
  label: string;
  category: string;
  blockType: string;
  blockId?: string;
  config?: Record<string, unknown>;
}

interface WFNode {
  id: string;
  data: WFNodeData;
}

interface WFEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// ── BFS level grouping (ported from frontend workflowEngine.ts) ──

function getNodesByLevel(
  startId: string,
  nodes: WFNode[],
  edges: WFEdge[],
): WFNode[][] {
  const levels: WFNode[][] = [];
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [{ id: startId, level: 0 }];

  while (queue.length > 0) {
    const { id: curId, level } = queue.shift()!;
    if (visited.has(curId)) continue;
    visited.add(curId);

    for (const edge of edges.filter((e) => e.source === curId)) {
      const target = nodes.find((n) => n.id === edge.target);
      if (!target || visited.has(edge.target)) continue;
      if (!levels[level]) levels[level] = [];
      levels[level].push(target);
      queue.push({ id: edge.target, level: level + 1 });
    }
  }

  return levels;
}

// ── Execute a single node (conditions/actions handled inline) ──

type Payload = Record<string, unknown>;

async function executeNode(
  node: WFNode,
  upstream: Payload,
): Promise<Payload> {
  const { category, blockType: bt, blockId, config: cfg = {} } = node.data;

  // AI / shared blocks → delegate to the existing runBlock service
  if (category === 'ai' && blockId) {
    const inputText =
      (cfg.text as string) ||
      (upstream.text as string) ||
      (upstream.value as string) ||
      '';
    const inputs: Record<string, string | string[]> = {
      text: inputText,
      value: inputText,
      text1: inputText,
      text2: '',
    };
    // Pass audioBase64 from upstream (for audio-player block)
    if (upstream.audioBase64) {
      inputs['audioBase64'] = String(upstream.audioBase64);
    }
    // For blocks with extra inputs, forward them
    if (cfg.targetLanguage) inputs['targetLanguage'] = String(cfg.targetLanguage);
    if (cfg.prompt) inputs['prompt'] = String(cfg.prompt);
    if (cfg.size) inputs['size'] = String(cfg.size);
    if (cfg.voiceId) inputs['voiceId'] = String(cfg.voiceId);
    if (cfg.webhookUrl) inputs['webhookUrl'] = String(cfg.webhookUrl);
    if (cfg.message) inputs['message'] = String(cfg.message);
    if (cfg.url) inputs['url'] = String(cfg.url);
    if (cfg.separator) inputs['separator'] = String(cfg.separator);
    if (cfg.pattern) inputs['pattern'] = String(cfg.pattern);

    const result = await runBlock(blockId as BlockId, inputs);
    // Normalize: expose first output value as `text` for downstream
    const firstVal = Object.values(result)[0] ?? '';
    return { ...result, text: String(firstVal) };
  }

  // Conditions
  if (category === 'condition') {
    const text = String(upstream.text ?? upstream.value ?? '');
    if (bt === 'text_contains') {
      const pattern = (cfg.pattern as string) ?? '';
      const cs = cfg.caseSensitive as boolean;
      const match = cs
        ? text.includes(pattern)
        : text.toLowerCase().includes(pattern.toLowerCase());
      if (!match) throw new Error('Condition failed: text does not contain pattern');
      return upstream;
    }
    if (bt === 'text_not_empty') {
      if (!text.trim()) throw new Error('Condition failed: text is empty');
      return upstream;
    }
    if (bt === 'confidence_check') {
      const conf = Number(upstream.confidence ?? 100);
      const threshold = (cfg.threshold as number) ?? 70;
      if (conf < threshold)
        throw new Error(`Condition failed: confidence ${conf}% < ${threshold}%`);
      return upstream;
    }
    return upstream;
  }

  // Actions
  if (category === 'action') {
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
      console.log('[Send Email]', {
        to: cfg.to,
        subject: cfg.subject,
        body: cfg.body,
        payload: upstream,
      });
      return upstream;
    }
    return upstream;
  }

  // Triggers (already resolved before BFS)
  return upstream;
}

// ── Streaming endpoint ──

runWorkflowRouter.post('/', async (req, res) => {
  const { nodes, edges, triggerNodeId } = req.body as {
    nodes: WFNode[];
    edges: WFEdge[];
    triggerNodeId: string;
  };

  if (!nodes || !edges || !triggerNodeId) {
    return res.status(400).json({ error: 'nodes, edges, and triggerNodeId required' });
  }

  const triggerNode = nodes.find((n) => n.id === triggerNodeId);
  if (!triggerNode) {
    return res.status(400).json({ error: 'Trigger node not found' });
  }

  // Set up NDJSON streaming
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const write = (obj: Record<string, unknown>) => {
    res.write(JSON.stringify(obj) + '\n');
  };

  // Payload cache: nodeId → output
  const payloads = new Map<string, Payload>();

  // Resolve trigger payload
  const triggerData = triggerNode.data;
  const triggerPayload: Payload = {
    trigger: true,
    text: (triggerData.config?.text as string) ?? '',
    value: (triggerData.config?.value as string) ?? '',
  };
  payloads.set(triggerNodeId, triggerPayload);

  write({
    type: 'start',
    blockId: triggerNodeId,
    blockType: triggerData.blockType,
    name: triggerData.label,
  });
  write({
    type: 'progress',
    blockId: triggerNodeId,
    blockType: triggerData.blockType,
    name: triggerData.label,
    outputs: triggerPayload,
  });

  // Get user id for entitlement / usage (once)
  let userId: string | undefined;
  try {
    userId = await getCustomerExternalId(req);
  } catch {
    userId = undefined;
  }

  try {
    const levels = getNodesByLevel(triggerNodeId, nodes, edges);

    for (const levelNodes of levels) {
      // Execute each node in the level (could parallelize, but sequential is safer for streaming)
      for (const node of levelNodes) {
        const { category, blockId, label } = node.data;

        write({
          type: 'start',
          blockId: node.id,
          blockType: node.data.blockType,
          name: label,
        });

        // Entitlement check for AI blocks
        if (!DEMO_MODE && category === 'ai' && blockId) {
          const block = getBlockById(blockId as BlockId);
          if (block && userId) {
            try {
              const billing = await flowglad(userId).getBilling();
              const hasAccess = billing.checkFeatureAccess(block.featureSlug);
              if (!hasAccess) {
                write({
                  type: 'error',
                  blockId: node.id,
                  name: label,
                  error: `Block locked: purchase or subscribe to unlock "${block.name}"`,
                });
                continue;
              }
            } catch {
              // If billing check fails, proceed in best-effort
            }
          }
        }

        try {
          // Resolve upstream payload
          const upstreamEdge = edges.find((e) => e.target === node.id);
          const upstreamPayload = upstreamEdge
            ? payloads.get(upstreamEdge.source) ?? {}
            : {};

          const output = await executeNode(node, upstreamPayload);
          payloads.set(node.id, output);

          write({
            type: 'progress',
            blockId: node.id,
            blockType: node.data.blockType,
            name: label,
            outputs: output,
          });

          // Usage recording for AI blocks
          if (!DEMO_MODE && category === 'ai' && blockId && userId) {
            const block = getBlockById(blockId as BlockId);
            if (block?.usageMeterSlug) {
              try {
                const billing = await flowglad(userId).getBilling();
                const subs =
                  billing.subscriptions?.filter(
                    (s: { status: string }) => s.status === 'active',
                  ) ?? [];
                const subId = (subs[0] as { id: string } | undefined)?.id;
                if (subId) {
                  await flowglad(userId).createUsageEvent({
                    amount: 1,
                    usageMeterSlug: block.usageMeterSlug,
                    subscriptionId: subId,
                    transactionId: `wf-${blockId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  });
                }
              } catch {
                // Best-effort usage recording
              }
            }
          }
        } catch (err) {
          write({
            type: 'error',
            blockId: node.id,
            name: label,
            error: err instanceof Error ? err.message : String(err),
          });
          // Condition failures stop the workflow
          if (category === 'condition') {
            write({ type: 'complete', status: 'failed' });
            res.end();
            return;
          }
        }
      }
    }

    write({ type: 'complete', status: 'completed' });
  } catch (err) {
    write({
      type: 'error',
      blockId: '__workflow__',
      error: err instanceof Error ? err.message : String(err),
    });
    write({ type: 'complete', status: 'failed' });
  }

  res.end();
});
