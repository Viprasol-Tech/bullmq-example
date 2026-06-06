/**
 * bullmq-example — public API.
 *
 * Typed BullMQ queue + worker example. Pure processor functions hold the
 * real work and are unit-tested without Redis; the queue/worker/flow/events
 * wiring is genuine BullMQ usage that requires a Redis server to run live.
 */

export {
  QUEUE_NAME,
  type EmailJobData,
  type ResizeJobData,
  type WebhookJobData,
  type ReportJobData,
  type JobDataMap,
  type JobName,
  type ExampleJob,
  type EmailJobResult,
  type ResizeJobResult,
  type WebhookJobResult,
  type ReportJobResult,
  type JobResultMap,
} from "./jobs.js";

export {
  processEmailJob,
  processResizeJob,
  processWebhookJob,
  processReportJob,
  InvalidJobDataError,
} from "./processors.js";

export {
  Priority,
  type PriorityLevel,
  priorityValue,
  type BackoffStrategy,
  type RetryConfig,
  retryOptions,
  type ScheduleConfig,
  scheduledOptions,
  type RepeatConfig,
  repeatOptions,
  mergeJobOptions,
} from "./options.js";

export {
  MetricsCollector,
  type QueueEventKind,
  type QueueEventRecord,
  type MetricsSnapshot,
} from "./metrics.js";

export { createQueueMonitor, type QueueMonitor } from "./events.js";

export {
  type FlowNode,
  buildFlow,
  countFlowJobs,
  addExampleFlow,
} from "./flow.js";

export { ExampleQueue, DEFAULT_CONNECTION } from "./queue.js";

export { createWorker, processJob } from "./worker.js";
