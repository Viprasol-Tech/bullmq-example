/**
 * Parent-child (flow) jobs.
 *
 * BullMQ "flows" let a parent job wait for a tree of child jobs to finish
 * before it runs. The shape of that tree is described by a `FlowJob`. Building
 * the tree is pure data manipulation, so we expose a typed, testable builder
 * here; pushing it to Redis via `FlowProducer` is shown in
 * {@link addExampleFlow}.
 */

import { FlowProducer } from "bullmq";
import type { ConnectionOptions, FlowJob } from "bullmq";
import { QUEUE_NAME } from "./jobs.js";
import type { ExampleJob } from "./jobs.js";
import { DEFAULT_CONNECTION } from "./queue.js";

/** A node in our example flow tree: a typed job plus optional children. */
export interface FlowNode {
  job: ExampleJob;
  children?: FlowNode[];
}

/**
 * Convert our {@link FlowNode} tree into a BullMQ {@link FlowJob}, defaulting
 * the queue name for every node to {@link QUEUE_NAME}. Pure and recursive — no
 * Redis required, so it can be asserted on directly in tests.
 *
 * @throws RangeError if the tree exceeds `maxDepth` (guards against cycles in
 *         hand-built trees).
 */
export function buildFlow(node: FlowNode, maxDepth = 10): FlowJob {
  const walk = (n: FlowNode, depth: number): FlowJob => {
    if (depth > maxDepth) {
      throw new RangeError(`flow tree exceeds maxDepth=${maxDepth}`);
    }
    const flow: FlowJob = {
      name: n.job.name,
      queueName: QUEUE_NAME,
      data: n.job.data,
    };
    if (n.children && n.children.length > 0) {
      flow.children = n.children.map((c) => walk(c, depth + 1));
    }
    return flow;
  };
  return walk(node, 0);
}

/**
 * Count the total number of jobs (parent + all descendants) in a flow tree.
 * Useful for logging / metrics before dispatch.
 */
export function countFlowJobs(node: FlowNode): number {
  const children = node.children ?? [];
  return 1 + children.reduce((sum, c) => sum + countFlowJobs(c), 0);
}

/**
 * Push a {@link FlowNode} tree to Redis via a `FlowProducer`. Requires a live
 * Redis server. Returns the created flow's job tree.
 */
export async function addExampleFlow(
  node: FlowNode,
  connection: ConnectionOptions = DEFAULT_CONNECTION,
) {
  const producer = new FlowProducer({ connection });
  try {
    return await producer.add(buildFlow(node));
  } finally {
    await producer.close();
  }
}
