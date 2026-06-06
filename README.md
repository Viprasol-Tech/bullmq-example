<div align="center">
  <img src="docs/assets/logo.png" alt="Viprasol Tech" width="120" />

  <h1>bullmq-example</h1>

  <p><strong>Typed BullMQ job queue example in TypeScript — real queue/worker wiring with unit-testable processor logic.</strong></p>

  <p><em>Built and maintained by Viprasol Tech</em></p>

  <p>
    <a href="https://github.com/Viprasol-Tech/bullmq-example/actions"><img src="https://github.com/Viprasol-Tech/bullmq-example/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT" /></a>
    <img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript strict" />
  </p>
</div>

## Features

- Typed job definitions — a discriminated `name`/`data` map so payloads can never drift from their job type.
- `ExampleQueue` wrapper exposing one typed `add*` method per job (`addEmailJob`, `addResizeJob`).
- Real BullMQ `Worker` setup that validates the job name and dispatches to pure processors.
- Pure processor functions (`processEmailJob`, `processResizeJob`) that hold the actual work and are unit-tested **without Redis**.
- Strict TypeScript, ESM, vitest test suite.

## Install

```bash
npm install
```

> **Redis required for live runs.** The pure processor functions and the worker dispatch logic are fully unit-tested without any infrastructure. To actually enqueue and process jobs with the live `Queue`/`Worker`, you need a reachable Redis server (set `REDIS_HOST` / `REDIS_PORT`, defaults `127.0.0.1:6379`). The queue and worker wiring in this repo is real BullMQ usage.

## Usage

### Unit-test the work without Redis

```ts
import { processEmailJob, processJob } from "bullmq-example";

const result = processEmailJob({
  to: "user@example.com",
  subject: "Hello",
  body: "World",
});
// { status: "sent", to: "user@example.com", size: 21 }

// The worker dispatch is also a pure, testable function:
processJob({ name: "resize", data: { source: "img.png", width: 100, height: 50 } });
// { status: "resized", source: "img.png", pixels: 5000 }
```

### Live queue + worker (requires Redis)

```ts
import { ExampleQueue, createWorker } from "bullmq-example";

// Producer
const queue = new ExampleQueue();
await queue.addEmailJob({ to: "user@example.com", subject: "Hi", body: "Welcome!" });
await queue.close();

// Consumer
const worker = createWorker();
worker.on("completed", (job, result) => {
  console.log(`job ${job.id} done`, result);
});
// ... later: await worker.close();
```

## API notes

- `QUEUE_NAME` — the single queue name used throughout the example.
- `ExampleQueue` — typed wrapper over BullMQ `Queue`; `addEmailJob(data, opts?)`, `addResizeJob(data, opts?)`, `close()`.
- `createWorker(connection?)` — builds a BullMQ `Worker` bound to the queue, delegating to `processJob`.
- `processJob(job)` — pure dispatch on `job.name`; throws `InvalidJobDataError` for unknown names.
- `processEmailJob(data)` / `processResizeJob(data)` — pure work functions that validate payloads and compute results.
- `InvalidJobDataError` — thrown when a payload fails validation.

## Contributing

Issues and pull requests are welcome. Please run `npm run typecheck` and `npm test` before submitting.

## Contact — Viprasol Tech Private Limited

- Website: [viprasol.com](https://viprasol.com)
- Email: [support@viprasol.com](mailto:support@viprasol.com)
- Telegram: [t.me/viprasol_help](https://t.me/viprasol_help) | WhatsApp: +91 96336 52112
- GitHub: [@Viprasol-Tech](https://github.com/Viprasol-Tech) | [LinkedIn](https://www.linkedin.com/in/viprasol/) | X [@viprasol](https://twitter.com/viprasol)

## License

[MIT](LICENSE) (c) 2025 Viprasol Tech Private Limited
