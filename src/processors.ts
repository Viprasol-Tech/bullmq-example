/**
 * Pure processor functions.
 *
 * These contain the *actual work* a worker performs, factored out so they
 * can be unit-tested without a live Redis / BullMQ Worker. The worker simply
 * validates the job name and delegates to one of these functions.
 */

import type {
  EmailJobData,
  EmailJobResult,
  ResizeJobData,
  ResizeJobResult,
} from "./jobs.js";

/** Error thrown when a job payload fails validation. */
export class InvalidJobDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJobDataError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Process an email job. Validates the payload, then "renders" the message
 * and reports its size. In a real app this is where you'd call your mail
 * provider — kept pure here so it is trivially testable.
 */
export function processEmailJob(data: EmailJobData): EmailJobResult {
  if (typeof data?.to !== "string" || !EMAIL_RE.test(data.to)) {
    throw new InvalidJobDataError(`invalid recipient address: ${String(data?.to)}`);
  }
  if (typeof data.subject !== "string" || data.subject.trim().length === 0) {
    throw new InvalidJobDataError("subject must be a non-empty string");
  }
  if (typeof data.body !== "string") {
    throw new InvalidJobDataError("body must be a string");
  }

  const rendered = `Subject: ${data.subject}\n\n${data.body}`;
  return { status: "sent", to: data.to, size: rendered.length };
}

/**
 * Process an image-resize job. Validates dimensions and reports the total
 * pixel count of the target size.
 */
export function processResizeJob(data: ResizeJobData): ResizeJobResult {
  if (typeof data?.source !== "string" || data.source.trim().length === 0) {
    throw new InvalidJobDataError("source must be a non-empty string");
  }
  if (!Number.isInteger(data.width) || data.width <= 0) {
    throw new InvalidJobDataError(`width must be a positive integer, got ${String(data.width)}`);
  }
  if (!Number.isInteger(data.height) || data.height <= 0) {
    throw new InvalidJobDataError(`height must be a positive integer, got ${String(data.height)}`);
  }

  return { status: "resized", source: data.source, pixels: data.width * data.height };
}
