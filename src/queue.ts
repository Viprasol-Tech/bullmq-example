/**
 * Typed Queue wrapper around BullMQ.
 *
 * Running this against a live queue requires a reachable Redis server (see
 * the README). The wiring here is real BullMQ usage — only the per-job work
 * is factored into pure functions in `processors.ts`, and the options builders
 * live in `options.ts`.
 */

import { Queue } from "bullmq";
import type { ConnectionOptions, JobsOptions } from "bullmq";
import { QUEUE_NAME } from "./jobs.js";
import type {
  EmailJobData,
  ResizeJobData,
  WebhookJobData,
  ReportJobData,
  JobName,
  JobDataMap,
} from "./jobs.js";
import {
  mergeJobOptions,
  priorityValue,
  repeatOptions,
  scheduledOptions,
} from "./options.js";
import type { PriorityLevel, RepeatConfig, ScheduleConfig } from "./options.js";

/** Default Redis connection (override via constructor). */
export const DEFAULT_CONNECTION: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

/**
 * Strongly-typed wrapper exposing one `add*` method per job type so callers
 * cannot enqueue a mismatched payload.
 */
export class ExampleQueue {
  readonly queue: Queue<JobDataMap[JobName]>;

  constructor(connection: ConnectionOptions = DEFAULT_CONNECTION) {
    this.queue = new Queue(QUEUE_NAME, { connection });
  }

  /** Enqueue an email job. */
  addEmailJob(data: EmailJobData, opts?: JobsOptions) {
    const name: JobName = "email";
    return this.queue.add(name, data, opts);
  }

  /** Enqueue an image-resize job. */
  addResizeJob(data: ResizeJobData, opts?: JobsOptions) {
    const name: JobName = "resize";
    return this.queue.add(name, data, opts);
  }

  /** Enqueue an outbound-webhook job. */
  addWebhookJob(data: WebhookJobData, opts?: JobsOptions) {
    const name: JobName = "webhook";
    return this.queue.add(name, data, opts);
  }

  /** Enqueue a report job. */
  addReportJob(data: ReportJobData, opts?: JobsOptions) {
    const name: JobName = "report";
    return this.queue.add(name, data, opts);
  }

  /**
   * Enqueue any job with a named priority level merged into its options.
   * Lower numeric priority is processed first (see {@link priorityValue}).
   */
  addWithPriority<K extends JobName>(
    name: K,
    data: JobDataMap[K],
    level: PriorityLevel,
    opts?: JobsOptions,
  ) {
    const merged = mergeJobOptions(opts, { priority: priorityValue(level) });
    return this.queue.add(name, data, merged);
  }

  /**
   * Enqueue a one-off job to run later, via a relative delay or absolute time.
   */
  addScheduled<K extends JobName>(
    name: K,
    data: JobDataMap[K],
    schedule: ScheduleConfig,
    opts?: JobsOptions,
  ) {
    const merged = mergeJobOptions(opts, scheduledOptions(schedule));
    return this.queue.add(name, data, merged);
  }

  /**
   * Register a repeatable / cron job. Returns the BullMQ job-scheduler entry.
   */
  addRepeatable<K extends JobName>(
    name: K,
    data: JobDataMap[K],
    repeat: RepeatConfig,
    opts?: JobsOptions,
  ) {
    return this.queue.add(name, data, mergeJobOptions(opts, { repeat: repeatOptions(repeat) }));
  }

  /** Close the underlying queue connection. */
  async close(): Promise<void> {
    await this.queue.close();
  }
}
