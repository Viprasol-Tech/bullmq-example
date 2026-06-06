import { describe, it, expect } from "vitest";
import { processJob } from "./worker.js";
import { InvalidJobDataError } from "./processors.js";
import type { JobDataMap } from "./jobs.js";

describe("processJob (worker dispatch, no Redis)", () => {
  it("routes email jobs to the email processor", () => {
    const data: JobDataMap["email"] = {
      to: "ops@example.com",
      subject: "Report",
      body: "ready",
    };
    const result = processJob({ name: "email", data });
    // "Subject: Report\n\nready" = 22 characters
    expect(result).toEqual({ status: "sent", to: "ops@example.com", size: 22 });
  });

  it("routes resize jobs to the resize processor", () => {
    const data: JobDataMap["resize"] = { source: "a.jpg", width: 4, height: 3 };
    const result = processJob({ name: "resize", data });
    expect(result).toEqual({ status: "resized", source: "a.jpg", pixels: 12 });
  });

  it("routes webhook jobs to the webhook processor", () => {
    const data: JobDataMap["webhook"] = {
      url: "https://example.com/hook",
      payload: { ping: true },
    };
    const result = processJob({ name: "webhook", data });
    expect(result).toMatchObject({ status: "queued", url: "https://example.com/hook" });
  });

  it("routes report jobs to the report processor", () => {
    const data: JobDataMap["report"] = {
      reportId: "weekly",
      from: "2025-01-01",
      to: "2025-01-03",
    };
    const result = processJob({ name: "report", data });
    expect(result).toEqual({ status: "generated", reportId: "weekly", days: 3 });
  });

  it("throws on an unknown job name", () => {
    expect(() =>
      processJob({ name: "unknown", data: {} as never }),
    ).toThrow(InvalidJobDataError);
  });

  it("propagates validation errors from the underlying processor", () => {
    const data = { to: "bad", subject: "x", body: "y" } as JobDataMap["email"];
    expect(() => processJob({ name: "email", data })).toThrow(InvalidJobDataError);
  });
});
