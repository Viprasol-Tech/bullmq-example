/**
 * Queue-metrics helper.
 *
 * BullMQ emits a stream of lifecycle events (`completed`, `failed`, `stalled`,
 * ...) via `QueueEvents`. Wiring that to a live Redis instance is shown in
 * `events.ts`. The aggregation logic itself — turning a sequence of events
 * into counters and latency stats — is factored out here as a pure, testable
 * state machine so you can verify your dashboards without a broker.
 */

/** Lifecycle event kinds we track. */
export type QueueEventKind =
  | "active"
  | "completed"
  | "failed"
  | "stalled"
  | "delayed";

/** A single normalised queue event. */
export interface QueueEventRecord {
  kind: QueueEventKind;
  jobId: string;
  /** Event timestamp in ms epoch. */
  at: number;
}

/** Snapshot of aggregated counters and latency. */
export interface MetricsSnapshot {
  active: number;
  completed: number;
  failed: number;
  stalled: number;
  delayed: number;
  /** completed / (completed + failed); 0 when no terminal jobs yet. */
  successRate: number;
  /** Number of jobs currently in-flight (active, not yet terminal). */
  inFlight: number;
  /** Mean active -> completed latency in ms (0 when none completed). */
  avgLatencyMs: number;
}

/**
 * Accumulates queue events into live metrics. Fully deterministic and
 * synchronous: feed it the same event sequence and you get the same snapshot.
 */
export class MetricsCollector {
  private active = 0;
  private completed = 0;
  private failed = 0;
  private stalled = 0;
  private delayed = 0;

  /** Jobs that have gone `active`, keyed by id, with their start time. */
  private readonly startedAt = new Map<string, number>();
  private latencyTotalMs = 0;
  private latencySamples = 0;

  /** Record a single event, updating internal counters. */
  record(event: QueueEventRecord): void {
    switch (event.kind) {
      case "active":
        this.active += 1;
        this.startedAt.set(event.jobId, event.at);
        break;
      case "completed": {
        this.completed += 1;
        this.settle(event);
        break;
      }
      case "failed":
        this.failed += 1;
        this.settle(event);
        break;
      case "stalled":
        this.stalled += 1;
        break;
      case "delayed":
        this.delayed += 1;
        break;
    }
  }

  /** Convenience: record a batch of events in order. */
  recordAll(events: Iterable<QueueEventRecord>): void {
    for (const e of events) this.record(e);
  }

  private settle(event: QueueEventRecord): void {
    const start = this.startedAt.get(event.jobId);
    if (start !== undefined) {
      const latency = event.at - start;
      if (latency >= 0) {
        this.latencyTotalMs += latency;
        this.latencySamples += 1;
      }
      this.startedAt.delete(event.jobId);
    }
  }

  /** Produce an immutable snapshot of the current metrics. */
  snapshot(): MetricsSnapshot {
    const terminal = this.completed + this.failed;
    const successRate = terminal === 0 ? 0 : this.completed / terminal;
    const avgLatencyMs =
      this.latencySamples === 0 ? 0 : this.latencyTotalMs / this.latencySamples;
    return {
      active: this.active,
      completed: this.completed,
      failed: this.failed,
      stalled: this.stalled,
      delayed: this.delayed,
      successRate,
      inFlight: this.startedAt.size,
      avgLatencyMs,
    };
  }

  /** Reset all counters back to zero. */
  reset(): void {
    this.active = 0;
    this.completed = 0;
    this.failed = 0;
    this.stalled = 0;
    this.delayed = 0;
    this.startedAt.clear();
    this.latencyTotalMs = 0;
    this.latencySamples = 0;
  }
}
