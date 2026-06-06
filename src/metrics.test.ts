import { describe, it, expect } from "vitest";
import { MetricsCollector } from "./metrics.js";
import type { QueueEventRecord } from "./metrics.js";

describe("MetricsCollector", () => {
  it("starts at zero", () => {
    const snap = new MetricsCollector().snapshot();
    expect(snap).toEqual({
      active: 0,
      completed: 0,
      failed: 0,
      stalled: 0,
      delayed: 0,
      successRate: 0,
      inFlight: 0,
      avgLatencyMs: 0,
    });
  });

  it("counts a full active -> completed lifecycle and latency", () => {
    const c = new MetricsCollector();
    c.record({ kind: "active", jobId: "1", at: 100 });
    c.record({ kind: "completed", jobId: "1", at: 350 });
    const snap = c.snapshot();
    expect(snap.active).toBe(1);
    expect(snap.completed).toBe(1);
    expect(snap.inFlight).toBe(0);
    expect(snap.avgLatencyMs).toBe(250);
    expect(snap.successRate).toBe(1);
  });

  it("computes success rate across completed and failed", () => {
    const c = new MetricsCollector();
    const events: QueueEventRecord[] = [
      { kind: "active", jobId: "a", at: 0 },
      { kind: "completed", jobId: "a", at: 10 },
      { kind: "active", jobId: "b", at: 0 },
      { kind: "completed", jobId: "b", at: 30 },
      { kind: "active", jobId: "c", at: 0 },
      { kind: "failed", jobId: "c", at: 5 },
    ];
    c.recordAll(events);
    const snap = c.snapshot();
    expect(snap.completed).toBe(2);
    expect(snap.failed).toBe(1);
    expect(snap.successRate).toBeCloseTo(2 / 3, 5);
    // Both terminal states contribute latency: (10 + 30 + 5) / 3 = 15
    expect(snap.avgLatencyMs).toBe(15);
  });

  it("reports in-flight jobs that have not yet settled", () => {
    const c = new MetricsCollector();
    c.record({ kind: "active", jobId: "x", at: 0 });
    c.record({ kind: "active", jobId: "y", at: 0 });
    c.record({ kind: "completed", jobId: "x", at: 5 });
    expect(c.snapshot().inFlight).toBe(1);
  });

  it("tracks stalled and delayed counters", () => {
    const c = new MetricsCollector();
    c.record({ kind: "stalled", jobId: "s", at: 0 });
    c.record({ kind: "delayed", jobId: "d", at: 0 });
    c.record({ kind: "delayed", jobId: "e", at: 0 });
    const snap = c.snapshot();
    expect(snap.stalled).toBe(1);
    expect(snap.delayed).toBe(2);
  });

  it("ignores negative latency from out-of-order timestamps", () => {
    const c = new MetricsCollector();
    c.record({ kind: "active", jobId: "z", at: 100 });
    c.record({ kind: "completed", jobId: "z", at: 50 });
    // latency would be -50; it is discarded so avg stays 0
    expect(c.snapshot().avgLatencyMs).toBe(0);
  });

  it("resets all state", () => {
    const c = new MetricsCollector();
    c.record({ kind: "completed", jobId: "1", at: 1 });
    c.reset();
    expect(c.snapshot().completed).toBe(0);
  });
});
