/**
 * Typed job definitions for the example queue.
 *
 * Every job that flows through the queue has a `name` (used by BullMQ to
 * route the job) and a strongly-typed `data` payload. Defining these as a
 * discriminated union lets the processor narrow on `job.name` and get full
 * type-safety on the payload.
 */

/** Name of the single queue used in this example. */
export const QUEUE_NAME = "example" as const;

/** Payload for an email-sending job. */
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

/** Payload for an image-resize job. */
export interface ResizeJobData {
  /** Source image identifier / URL. */
  source: string;
  width: number;
  height: number;
}

/** Payload for an outbound webhook delivery job. */
export interface WebhookJobData {
  /** Destination URL (must be http/https). */
  url: string;
  /** JSON-serialisable payload to POST. */
  payload: Record<string, unknown>;
  /** Optional extra headers. */
  headers?: Record<string, string>;
}

/** Payload for a periodic report-generation job. */
export interface ReportJobData {
  /** Report identifier, e.g. "daily-signups". */
  reportId: string;
  /** Inclusive ISO date range start (YYYY-MM-DD). */
  from: string;
  /** Inclusive ISO date range end (YYYY-MM-DD). */
  to: string;
}

/** Discriminated map of job name -> payload type. */
export interface JobDataMap {
  email: EmailJobData;
  resize: ResizeJobData;
  webhook: WebhookJobData;
  report: ReportJobData;
}

/** All valid job names. */
export type JobName = keyof JobDataMap;

/** A fully-typed job descriptor (name + matching data). */
export type ExampleJob = {
  [K in JobName]: { name: K; data: JobDataMap[K] };
}[JobName];

/** Result returned by the email processor. */
export interface EmailJobResult {
  status: "sent";
  to: string;
  /** Number of characters in the rendered message. */
  size: number;
}

/** Result returned by the resize processor. */
export interface ResizeJobResult {
  status: "resized";
  source: string;
  pixels: number;
}

/** Result returned by the webhook processor. */
export interface WebhookJobResult {
  status: "queued";
  url: string;
  /** Number of bytes in the serialised request body. */
  bytes: number;
  /** Count of headers that will be sent (incl. content-type). */
  headerCount: number;
}

/** Result returned by the report processor. */
export interface ReportJobResult {
  status: "generated";
  reportId: string;
  /** Number of whole days covered by the [from, to] range (inclusive). */
  days: number;
}

/** Map of job name -> result type. */
export interface JobResultMap {
  email: EmailJobResult;
  resize: ResizeJobResult;
  webhook: WebhookJobResult;
  report: ReportJobResult;
}
