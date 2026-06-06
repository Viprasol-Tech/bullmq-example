/**
 * bullmq-example — public API.
 *
 * Typed BullMQ queue + worker example. Pure processor functions hold the
 * real work and are unit-tested without Redis; the queue/worker wiring is
 * genuine BullMQ usage that requires a Redis server to run live.
 */

export {
  QUEUE_NAME,
  type EmailJobData,
  type ResizeJobData,
  type JobDataMap,
  type JobName,
  type ExampleJob,
  type EmailJobResult,
  type ResizeJobResult,
  type JobResultMap,
} from "./jobs.js";

export {
  processEmailJob,
  processResizeJob,
  InvalidJobDataError,
} from "./processors.js";

export { ExampleQueue, DEFAULT_CONNECTION } from "./queue.js";

export { createWorker, processJob } from "./worker.js";
