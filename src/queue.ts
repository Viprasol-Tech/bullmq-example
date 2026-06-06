/**
 * Typed Queue wrapper around BullMQ.
 *
 * Running this against a live queue requires a reachable Redis server (see
 * the README). The wiring here is real BullMQ usage — only the per-job work
 * is factored into pure functions in `processors.ts`.
 */

import { Queue } from "bullmq";
import type { ConnectionOptions, JobsOptions } from "bullmq";
import { QUEUE_NAME } from "./jobs.js";
import type { EmailJobData, ResizeJobData, JobName, JobDataMap } from "./jobs.js";

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

  /** Close the underlying queue connection. */
  async close(): Promise<void> {
    await this.queue.close();
  }
}
