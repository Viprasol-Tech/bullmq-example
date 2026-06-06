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

/** Discriminated map of job name -> payload type. */
export interface JobDataMap {
  email: EmailJobData;
  resize: ResizeJobData;
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

/** Map of job name -> result type. */
export interface JobResultMap {
  email: EmailJobResult;
  resize: ResizeJobResult;
}
