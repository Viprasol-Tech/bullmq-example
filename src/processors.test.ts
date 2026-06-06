import { describe, it, expect } from "vitest";
import {
  processEmailJob,
  processResizeJob,
  InvalidJobDataError,
} from "./processors.js";
import type { EmailJobData, ResizeJobData } from "./jobs.js";

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
