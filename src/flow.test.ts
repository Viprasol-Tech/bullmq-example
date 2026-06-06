import { describe, it, expect } from "vitest";
import { buildFlow, countFlowJobs } from "./flow.js";
import type { FlowNode } from "./flow.js";
import { QUEUE_NAME } from "./jobs.js";

const tree: FlowNode = {
  job: {
    name: "email",
    data: { to: "boss@example.com", subject: "Done", body: "All children finished" },
  },
  children: [
    {
      job: { name: "resize", data: { source: "a.png", width: 10, height: 10 } },
    },
    {
      job: {
        name: "report",
        data: { reportId: "weekly", from: "2025-01-01", to: "2025-01-07" },
      },
      children: [
        {
          job: {
            name: "webhook",
            data: { url: "https://example.com/hook", payload: { ok: true } },
          },
        },
      ],
    },
  ],
};

describe("buildFlow", () => {
  it("assigns the queue name to every node", () => {
    const flow = buildFlow(tree);
    expect(flow.queueName).toBe(QUEUE_NAME);
    expect(flow.children?.[0]?.queueName).toBe(QUEUE_NAME);
    expect(flow.children?.[1]?.children?.[0]?.queueName).toBe(QUEUE_NAME);
  });

  it("preserves job names and data through the tree", () => {
    const flow = buildFlow(tree);
    expect(flow.name).toBe("email");
    expect(flow.children?.[1]?.name).toBe("report");
    expect(flow.children?.[1]?.children?.[0]?.name).toBe("webhook");
    expect(flow.children?.[1]?.children?.[0]?.data).toEqual({
      url: "https://example.com/hook",
      payload: { ok: true },
    });
  });

  it("omits the children field for leaf nodes", () => {
    const leaf: FlowNode = {
      job: { name: "resize", data: { source: "x", width: 1, height: 1 } },
    };
    expect(buildFlow(leaf).children).toBeUndefined();
  });

  it("guards against trees deeper than maxDepth", () => {
    const deep: FlowNode = {
      job: { name: "resize", data: { source: "x", width: 1, height: 1 } },
      children: [
        { job: { name: "resize", data: { source: "y", width: 1, height: 1 } } },
      ],
    };
    expect(() => buildFlow(deep, 0)).toThrow(RangeError);
  });
});

describe("countFlowJobs", () => {
  it("counts parent plus all descendants", () => {
    expect(countFlowJobs(tree)).toBe(4);
  });

  it("counts a single leaf as one", () => {
    const leaf: FlowNode = {
      job: { name: "resize", data: { source: "x", width: 1, height: 1 } },
    };
    expect(countFlowJobs(leaf)).toBe(1);
  });
});
