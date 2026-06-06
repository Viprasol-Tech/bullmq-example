# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/); versioning
follows [SemVer](https://semver.org/).

## [0.2.0] - 2025

### Added
- **Job priorities** — named levels (`critical`/`high`/`normal`/`low`/`bulk`)
  via `Priority` and `priorityValue`, plus `ExampleQueue.addWithPriority`.
- **Retry & backoff** — `retryOptions` builder for fixed/exponential backoff
  with validated attempts and delay.
- **Scheduled jobs** — `scheduledOptions` (relative `delayMs` or absolute
  `runAt`) and `ExampleQueue.addScheduled`.
- **Repeatable / cron jobs** — `repeatOptions` (cron pattern + timezone, or
  fixed `everyMs` interval, with optional `limit`) and
  `ExampleQueue.addRepeatable`.
- **Parent-child flows** — `FlowNode` tree type, pure `buildFlow` /
  `countFlowJobs` builders, and live `addExampleFlow` via `FlowProducer`.
- **Queue metrics** — Redis-free `MetricsCollector` state machine (counters,
  success rate, in-flight, average latency) and a live `createQueueMonitor`
  that wires BullMQ `QueueEvents` into it.
- **New typed processors** — `processWebhookJob` (URL + payload validation,
  byte/header accounting) and `processReportJob` (ISO date-range day span),
  with matching job/result types and worker dispatch.
- `mergeJobOptions` helper to compose option fragments.
- Roughly 4x the test coverage (57 tests across processors, worker, options,
  metrics, and flows) — all Redis-free.

### Changed
- `ExampleQueue` and the worker dispatcher now handle four job types.
- Public API surface (`src/index.ts`) re-exports all new builders and helpers.

## [0.1.0] - 2025

### Added
- Initial release of bullmq-example: BullMQ job queue example (TypeScript) with typed jobs and processor logic.
