/**
 * Job-options helpers.
 *
 * These are pure builders that produce BullMQ `JobsOptions` / `RepeatOptions`
 * objects with sensible, strongly-typed defaults. Keeping them as plain
 * functions means they are trivial to unit-test without a live Redis server,
 * while remaining 100% compatible with what `Queue.add` expects.
 */

import type { BackoffOptions, JobsOptions, RepeatOptions } from "bullmq";

/**
 * Named priority levels. BullMQ treats a *lower* numeric priority as more
 * urgent (1 is processed before 10). We expose readable names so callers do
 * not have to memorise the ordering.
 */
export const Priority = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
  bulk: 5,
} as const;

/** Union of valid priority level names. */
export type PriorityLevel = keyof typeof Priority;

/** Resolve a named priority level to its BullMQ numeric value. */
export function priorityValue(level: PriorityLevel): number {
  return Priority[level];
}

/** Backoff strategies BullMQ understands out of the box. */
export type BackoffStrategy = "fixed" | "exponential";

/** Tunable inputs for {@link retryOptions}. */
export interface RetryConfig {
  /** Total number of attempts (incl. the first). Must be >= 1. */
  attempts: number;
  /** Backoff strategy between attempts. Defaults to "exponential". */
  strategy?: BackoffStrategy;
  /** Base delay in milliseconds. Must be >= 0. Defaults to 1000. */
  delayMs?: number;
}

/**
 * Build a `JobsOptions` fragment describing retry + backoff behaviour.
 *
 * @throws RangeError if `attempts` < 1 or `delayMs` < 0.
 */
export function retryOptions(config: RetryConfig): JobsOptions {
  const { attempts, strategy = "exponential", delayMs = 1000 } = config;
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`attempts must be an integer >= 1, got ${String(attempts)}`);
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError(`delayMs must be a finite number >= 0, got ${String(delayMs)}`);
  }
  const backoff: BackoffOptions = { type: strategy, delay: delayMs };
  return { attempts, backoff };
}

/** Inputs for {@link scheduledOptions}. */
export interface ScheduleConfig {
  /** Fixed delay before the job becomes available, in milliseconds. */
  delayMs?: number;
  /** Absolute timestamp (ms epoch) at which the job should run. */
  runAt?: number;
}

/**
 * Build options that delay a one-off job. Provide either a relative `delayMs`
 * or an absolute `runAt` timestamp (the latter is converted to a delay
 * relative to `now`).
 *
 * @throws RangeError when neither field is provided, or a delay is negative.
 */
export function scheduledOptions(
  config: ScheduleConfig,
  now: number = Date.now(),
): JobsOptions {
  if (config.delayMs === undefined && config.runAt === undefined) {
    throw new RangeError("scheduledOptions requires either delayMs or runAt");
  }
  const delay =
    config.runAt !== undefined ? config.runAt - now : (config.delayMs ?? 0);
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError(`computed delay must be >= 0, got ${String(delay)}`);
  }
  return { delay };
}

/** Inputs for {@link repeatOptions}. */
export interface RepeatConfig {
  /** Cron pattern (e.g. "0 9 * * *" for 09:00 daily). */
  pattern?: string;
  /** Fixed interval in milliseconds (mutually exclusive with `pattern`). */
  everyMs?: number;
  /** Optional cap on the number of repetitions. */
  limit?: number;
  /** Optional IANA timezone for cron patterns, e.g. "Europe/London". */
  tz?: string;
}

/**
 * Build `RepeatOptions` for a repeatable / cron job. Exactly one of `pattern`
 * or `everyMs` must be supplied.
 *
 * @throws RangeError when neither or both scheduling modes are supplied.
 */
export function repeatOptions(config: RepeatConfig): RepeatOptions {
  const hasPattern = typeof config.pattern === "string" && config.pattern.length > 0;
  const hasEvery = typeof config.everyMs === "number";
  if (hasPattern === hasEvery) {
    throw new RangeError("repeatOptions requires exactly one of pattern or everyMs");
  }
  if (hasEvery && (!Number.isFinite(config.everyMs) || (config.everyMs as number) <= 0)) {
    throw new RangeError(`everyMs must be a positive number, got ${String(config.everyMs)}`);
  }
  if (config.limit !== undefined && (!Number.isInteger(config.limit) || config.limit < 1)) {
    throw new RangeError(`limit must be an integer >= 1, got ${String(config.limit)}`);
  }

  const opts: RepeatOptions = {};
  if (hasPattern) {
    opts.pattern = config.pattern;
    if (config.tz !== undefined) opts.tz = config.tz;
  } else {
    opts.every = config.everyMs;
  }
  if (config.limit !== undefined) opts.limit = config.limit;
  return opts;
}

/**
 * Compose several `JobsOptions` fragments (e.g. retry + schedule + priority)
 * into a single object. Later fragments override earlier ones on conflict.
 */
export function mergeJobOptions(...fragments: Array<JobsOptions | undefined>): JobsOptions {
  return fragments.reduce<JobsOptions>((acc, frag) => {
    return frag ? { ...acc, ...frag } : acc;
  }, {});
}
