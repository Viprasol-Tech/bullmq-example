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
  WebhookJobData,
  WebhookJobResult,
  ReportJobData,
  ReportJobResult,
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Process an outbound-webhook job. Validates the URL and payload, then reports
 * the serialised body size and header count. The real network call belongs in
 * the worker layer; the pure logic here is what we assert on in tests.
 */
export function processWebhookJob(data: WebhookJobData): WebhookJobResult {
  if (typeof data?.url !== "string" || data.url.trim().length === 0) {
    throw new InvalidJobDataError("url must be a non-empty string");
  }
  let parsed: URL;
  try {
    parsed = new URL(data.url);
  } catch {
    throw new InvalidJobDataError(`url is not a valid URL: ${data.url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidJobDataError(`url must use http or https, got ${parsed.protocol}`);
  }
  if (data.payload === null || typeof data.payload !== "object" || Array.isArray(data.payload)) {
    throw new InvalidJobDataError("payload must be a plain object");
  }

  let body: string;
  try {
    body = JSON.stringify(data.payload);
  } catch {
    throw new InvalidJobDataError("payload is not JSON-serialisable");
  }

  const extraHeaders = data.headers ?? {};
  // +1 accounts for the implicit "content-type: application/json" header.
  const headerCount = Object.keys(extraHeaders).length + 1;

  return {
    status: "queued",
    url: data.url,
    bytes: Buffer.byteLength(body, "utf8"),
    headerCount,
  };
}

/**
 * Process a periodic report job. Validates the ISO date range and computes the
 * inclusive day span. Typically enqueued as a repeatable/cron job.
 */
export function processReportJob(data: ReportJobData): ReportJobResult {
  if (typeof data?.reportId !== "string" || data.reportId.trim().length === 0) {
    throw new InvalidJobDataError("reportId must be a non-empty string");
  }
  if (typeof data.from !== "string" || !DATE_RE.test(data.from)) {
    throw new InvalidJobDataError(`from must be a YYYY-MM-DD date, got ${String(data.from)}`);
  }
  if (typeof data.to !== "string" || !DATE_RE.test(data.to)) {
    throw new InvalidJobDataError(`to must be a YYYY-MM-DD date, got ${String(data.to)}`);
  }

  const fromTs = Date.parse(`${data.from}T00:00:00.000Z`);
  const toTs = Date.parse(`${data.to}T00:00:00.000Z`);
  if (Number.isNaN(fromTs) || Number.isNaN(toTs)) {
    throw new InvalidJobDataError("from/to must be calendar dates");
  }
  if (toTs < fromTs) {
    throw new InvalidJobDataError("to must not be earlier than from");
  }

  const days = Math.round((toTs - fromTs) / MS_PER_DAY) + 1;
  return { status: "generated", reportId: data.reportId, days };
}
