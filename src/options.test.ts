import { describe, it, expect } from "vitest";
import {
  Priority,
  priorityValue,
  retryOptions,
  scheduledOptions,
  repeatOptions,
  mergeJobOptions,
} from "./options.js";

describe("priority", () => {
  it("orders critical before bulk", () => {
    expect(priorityValue("critical")).toBeLessThan(priorityValue("bulk"));
  });

  it("maps every named level to its numeric value", () => {
    expect(priorityValue("normal")).toBe(Priority.normal);
    expect(priorityValue("high")).toBe(2);
  });
});

describe("retryOptions", () => {
  it("builds exponential backoff by default", () => {
    expect(retryOptions({ attempts: 5 })).toEqual({
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
    });
  });

  it("honours a fixed strategy and custom delay", () => {
    expect(retryOptions({ attempts: 3, strategy: "fixed", delayMs: 250 })).toEqual({
      attempts: 3,
      backoff: { type: "fixed", delay: 250 },
    });
  });

  it("rejects attempts < 1", () => {
    expect(() => retryOptions({ attempts: 0 })).toThrow(RangeError);
  });

  it("rejects a negative delay", () => {
    expect(() => retryOptions({ attempts: 2, delayMs: -1 })).toThrow(RangeError);
  });
});

describe("scheduledOptions", () => {
  it("passes through a relative delay", () => {
    expect(scheduledOptions({ delayMs: 5000 })).toEqual({ delay: 5000 });
  });

  it("converts an absolute runAt into a delay relative to now", () => {
    const now = 1_000_000;
    expect(scheduledOptions({ runAt: now + 30_000 }, now)).toEqual({ delay: 30_000 });
  });

  it("rejects a runAt in the past", () => {
    const now = 1_000_000;
    expect(() => scheduledOptions({ runAt: now - 1 }, now)).toThrow(RangeError);
  });

  it("rejects an empty config", () => {
    expect(() => scheduledOptions({})).toThrow(/delayMs or runAt/);
  });
});

describe("repeatOptions", () => {
  it("builds a cron pattern with timezone", () => {
    expect(repeatOptions({ pattern: "0 9 * * *", tz: "Europe/London" })).toEqual({
      pattern: "0 9 * * *",
      tz: "Europe/London",
    });
  });

  it("builds a fixed interval", () => {
    expect(repeatOptions({ everyMs: 60_000, limit: 10 })).toEqual({
      every: 60_000,
      limit: 10,
    });
  });

  it("rejects supplying both pattern and everyMs", () => {
    expect(() => repeatOptions({ pattern: "* * * * *", everyMs: 1000 })).toThrow(RangeError);
  });

  it("rejects supplying neither", () => {
    expect(() => repeatOptions({})).toThrow(RangeError);
  });

  it("rejects a non-positive interval", () => {
    expect(() => repeatOptions({ everyMs: 0 })).toThrow(RangeError);
  });

  it("rejects an invalid limit", () => {
    expect(() => repeatOptions({ everyMs: 1000, limit: 0 })).toThrow(RangeError);
  });
});

describe("mergeJobOptions", () => {
  it("composes fragments with later overriding earlier", () => {
    const merged = mergeJobOptions(
      retryOptions({ attempts: 3 }),
      { priority: priorityValue("high") },
      scheduledOptions({ delayMs: 1000 }),
    );
    expect(merged).toMatchObject({
      attempts: 3,
      priority: 2,
      delay: 1000,
    });
  });

  it("ignores undefined fragments", () => {
    expect(mergeJobOptions(undefined, { priority: 1 }, undefined)).toEqual({ priority: 1 });
  });
});
