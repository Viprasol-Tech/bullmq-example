import { describe, it, expect } from "vitest";
import {
  processEmailJob,
  processResizeJob,
  processWebhookJob,
  processReportJob,
  InvalidJobDataError,
} from "./processors.js";
import type {
  EmailJobData,
  ResizeJobData,
  WebhookJobData,
  ReportJobData,
} from "./jobs.js";

describe("processEmailJob", () => {
  it("processes a valid email job and computes message size", () => {
    const data: EmailJobData = {
      to: "user@example.com",
      subject: "Hello",
      body: "World",
    };
    const result = processEmailJob(data);
    // "Subject: Hello\n\nWorld" = 21 characters
    expect(result).toEqual({ status: "sent", to: "user@example.com", size: 21 });
  });

  it("rejects an invalid recipient address", () => {
    const data = { to: "not-an-email", subject: "Hi", body: "x" } as EmailJobData;
    expect(() => processEmailJob(data)).toThrow(InvalidJobDataError);
  });

  it("rejects an empty subject", () => {
    const data = { to: "a@b.co", subject: "   ", body: "x" } as EmailJobData;
    expect(() => processEmailJob(data)).toThrow(/subject/);
  });

  it("rejects a non-string body", () => {
    const data = { to: "a@b.co", subject: "Hi", body: 42 } as unknown as EmailJobData;
    expect(() => processEmailJob(data)).toThrow(InvalidJobDataError);
  });

  it("rejects missing payload", () => {
    expect(() => processEmailJob(undefined as unknown as EmailJobData)).toThrow(
      InvalidJobDataError,
    );
  });
});

describe("processResizeJob", () => {
  it("processes a valid resize job and computes pixel count", () => {
    const data: ResizeJobData = { source: "img.png", width: 100, height: 50 };
    const result = processResizeJob(data);
    expect(result).toEqual({ status: "resized", source: "img.png", pixels: 5000 });
  });

  it("rejects non-positive width", () => {
    const data = { source: "img.png", width: 0, height: 10 } as ResizeJobData;
    expect(() => processResizeJob(data)).toThrow(/width/);
  });

  it("rejects non-integer height", () => {
    const data = { source: "img.png", width: 10, height: 5.5 } as ResizeJobData;
    expect(() => processResizeJob(data)).toThrow(/height/);
  });

  it("rejects an empty source", () => {
    const data = { source: "", width: 10, height: 10 } as ResizeJobData;
    expect(() => processResizeJob(data)).toThrow(InvalidJobDataError);
  });
});

describe("processWebhookJob", () => {
  it("queues a valid webhook and reports body bytes + header count", () => {
    const data: WebhookJobData = {
      url: "https://example.com/hook",
      payload: { id: 1, ok: true },
      headers: { "x-trace": "abc" },
    };
    const result = processWebhookJob(data);
    expect(result.status).toBe("queued");
    expect(result.url).toBe("https://example.com/hook");
    // JSON.stringify({id:1,ok:true}) === '{"id":1,"ok":true}' (18 bytes)
    expect(result.bytes).toBe(18);
    // one custom header + implicit content-type
    expect(result.headerCount).toBe(2);
  });

  it("defaults to a single (content-type) header when none supplied", () => {
    const result = processWebhookJob({
      url: "http://localhost:3000/x",
      payload: {},
    });
    expect(result.headerCount).toBe(1);
    expect(result.bytes).toBe(2); // "{}"
  });

  it("rejects a non-http(s) protocol", () => {
    const data = { url: "ftp://example.com", payload: {} } as WebhookJobData;
    expect(() => processWebhookJob(data)).toThrow(/http or https/);
  });

  it("rejects a malformed url", () => {
    const data = { url: "not a url", payload: {} } as WebhookJobData;
    expect(() => processWebhookJob(data)).toThrow(InvalidJobDataError);
  });

  it("rejects an array payload", () => {
    const data = { url: "https://x.io", payload: [] } as unknown as WebhookJobData;
    expect(() => processWebhookJob(data)).toThrow(/plain object/);
  });

  it("rejects a missing url", () => {
    const data = { payload: {} } as WebhookJobData;
    expect(() => processWebhookJob(data)).toThrow(InvalidJobDataError);
  });
});

describe("processReportJob", () => {
  it("computes an inclusive day span for a valid range", () => {
    const data: ReportJobData = {
      reportId: "daily-signups",
      from: "2025-01-01",
      to: "2025-01-07",
    };
    const result = processReportJob(data);
    expect(result).toEqual({ status: "generated", reportId: "daily-signups", days: 7 });
  });

  it("treats a single day as a span of 1", () => {
    const result = processReportJob({
      reportId: "r",
      from: "2025-06-06",
      to: "2025-06-06",
    });
    expect(result.days).toBe(1);
  });

  it("rejects a reversed range", () => {
    const data = { reportId: "r", from: "2025-02-01", to: "2025-01-01" } as ReportJobData;
    expect(() => processReportJob(data)).toThrow(/not be earlier/);
  });

  it("rejects a malformed date", () => {
    const data = { reportId: "r", from: "01-01-2025", to: "2025-01-02" } as ReportJobData;
    expect(() => processReportJob(data)).toThrow(/YYYY-MM-DD/);
  });

  it("rejects an empty reportId", () => {
    const data = { reportId: "", from: "2025-01-01", to: "2025-01-02" } as ReportJobData;
    expect(() => processReportJob(data)).toThrow(InvalidJobDataError);
  });
});
