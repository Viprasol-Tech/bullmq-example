/**
 * Live `QueueEvents` wiring.
 *
 * This connects BullMQ's event stream to a {@link MetricsCollector}. It needs
 * a reachable Redis server to run (see the README). The aggregation it feeds
 * is the pure, fully-tested logic in `metrics.ts`.
 */

import { QueueEvents } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { QUEUE_NAME } from "./jobs.js";
import { MetricsCollector } from "./metrics.js";
import type { QueueEventKind } from "./metrics.js";
import { DEFAULT_CONNECTION } from "./queue.js";

/** A live metrics monitor bound to the example queue's event stream. */
export interface QueueMonitor {
  /** The collector accumulating metrics; call `.snapshot()` to read it. */
  readonly metrics: MetricsCollector;
  /** The underlying BullMQ `QueueEvents` instance. */
  readonly events: QueueEvents;
  /** Detach listeners and close the Redis connection. */
  close(): Promise<void>;
}

/**
 * Create a {@link QueueMonitor}: a `QueueEvents` listener that forwards every
 * lifecycle event into a fresh {@link MetricsCollector}.
 */
export function createQueueMonitor(
  connection: ConnectionOptions = DEFAULT_CONNECTION,
): QueueMonitor {
  const metrics = new MetricsCollector();
  const events = new QueueEvents(QUEUE_NAME, { connection });

  const forward = (kind: QueueEventKind) => (args: { jobId: string }) => {
    metrics.record({ kind, jobId: args.jobId, at: Date.now() });
  };

  events.on("active", forward("active"));
  events.on("completed", forward("completed"));
  events.on("failed", forward("failed"));
  events.on("stalled", forward("stalled"));
  events.on("delayed", forward("delayed"));

  return {
    metrics,
    events,
    async close() {
      await events.close();
    },
  };
}
