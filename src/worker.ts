/**
 * BullMQ Worker setup.
 *
 * The worker validates the incoming job name, delegates the real work to the
 * pure processor functions, and returns a typed result. Requires a live Redis
 * server to actually run (see the README).
 */

import { Worker } from "bullmq";
import type { ConnectionOptions, Job, Processor } from "bullmq";
import { QUEUE_NAME } from "./jobs.js";
import type { JobDataMap, JobName, JobResultMap } from "./jobs.js";
import {
  processEmailJob,
  processResizeJob,
  processWebhookJob,
  processReportJob,
  InvalidJobDataError,
} from "./processors.js";
import { DEFAULT_CONNECTION } from "./queue.js";

type AnyJobData = JobDataMap[JobName];
type AnyJobResult = JobResultMap[JobName];

/**
 * The core processor delegated to by the Worker. Exported so it can be unit
 * tested by passing a minimal job-shaped object — no Redis required.
 */
export function processJob(job: Pick<Job<AnyJobData>, "name" | "data">): AnyJobResult {
  switch (job.name as JobName) {
    case "email":
      return processEmailJob(job.data as JobDataMap["email"]);
    case "resize":
      return processResizeJob(job.data as JobDataMap["resize"]);
    case "webhook":
      return processWebhookJob(job.data as JobDataMap["webhook"]);
    case "report":
      return processReportJob(job.data as JobDataMap["report"]);
    default:
      throw new InvalidJobDataError(`unknown job name: ${job.name}`);
  }
}

/**
 * Build (but do not start blocking) a BullMQ Worker bound to the example
 * queue. Returns the Worker instance; call `worker.close()` when done.
 */
export function createWorker(connection: ConnectionOptions = DEFAULT_CONNECTION): Worker<AnyJobData, AnyJobResult> {
  const processor: Processor<AnyJobData, AnyJobResult> = async (job) => processJob(job);
  return new Worker<AnyJobData, AnyJobResult>(QUEUE_NAME, processor, { connection });
}
