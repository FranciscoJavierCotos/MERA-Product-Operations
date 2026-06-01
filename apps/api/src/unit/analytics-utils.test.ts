/**
 * Unit tests: analytics pure helpers
 *
 * These functions back the /analytics aggregates. They take plain data and
 * return plain data — no Supabase, no network — so they can be exercised
 * exhaustively here.
 */
import { describe, it, expect } from "vitest";
import {
  ageBucket,
  complianceRate,
  dayRange,
  median,
  netFlowSeries,
  pctDelta,
  percentile,
  resolutionHours,
  resolveRange,
} from "../services/analytics-utils.js";

describe("resolveRange", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("30d current window is 30 days wide and previous is the prior 30", () => {
    const { current, previous } = resolveRange("30d", now);
    const dayMs = 86_400_000;
    expect(current.end).toEqual(now);
    expect((current.end.getTime() - current.start.getTime()) / dayMs).toBe(30);
    expect(previous.end).toEqual(current.start);
    expect((previous.end.getTime() - previous.start.getTime()) / dayMs).toBe(30);
  });

  it("ytd starts on Jan 1 UTC", () => {
    const { current } = resolveRange("ytd", now);
    expect(current.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("qtd starts at the first day of the current quarter", () => {
    // June is in Q2 → quarter starts April 1.
    const { current } = resolveRange("qtd", now);
    expect(current.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("percentile / median", () => {
  it("returns null for empty input", () => {
    expect(percentile([], 90)).toBeNull();
    expect(median([])).toBeNull();
  });

  it("computes median of an odd-length set", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("interpolates between ranks", () => {
    // p90 of 1..10 → rank 8.1 → 9 + 0.1*(10-9) = 9.1
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBeCloseTo(9.1);
  });

  it("single element returns that element", () => {
    expect(percentile([42], 99)).toBe(42);
  });
});

describe("pctDelta", () => {
  it("computes signed percentage change", () => {
    expect(pctDelta(110, 100)).toBeCloseTo(10);
    expect(pctDelta(90, 100)).toBeCloseTo(-10);
  });
  it("returns null with no baseline", () => {
    expect(pctDelta(5, 0)).toBeNull();
  });
});

describe("complianceRate", () => {
  it("is a percentage", () => {
    expect(complianceRate(95, 100)).toBe(95);
  });
  it("is null when total is zero", () => {
    expect(complianceRate(0, 0)).toBeNull();
  });
});

describe("resolutionHours", () => {
  it("subtracts paused minutes and converts to hours", () => {
    const created = "2026-06-01T00:00:00.000Z";
    const resolved = "2026-06-01T10:00:00.000Z"; // 600 min wall
    expect(resolutionHours(created, resolved, 120)).toBeCloseTo(8); // (600-120)/60
  });
  it("never goes negative", () => {
    const created = "2026-06-01T00:00:00.000Z";
    const resolved = "2026-06-01T01:00:00.000Z"; // 60 min
    expect(resolutionHours(created, resolved, 999)).toBe(0);
  });
});

describe("ageBucket", () => {
  it("maps ages to the fixed buckets", () => {
    expect(ageBucket(0.5)).toBe("<1d");
    expect(ageBucket(2)).toBe("1-3d");
    expect(ageBucket(5)).toBe("4-7d");
    expect(ageBucket(20)).toBe("8-30d");
    expect(ageBucket(45)).toBe(">30d");
  });
});

describe("dayRange", () => {
  it("is inclusive of both endpoints", () => {
    const days = dayRange({
      start: new Date("2026-06-01T08:00:00Z"),
      end: new Date("2026-06-03T20:00:00Z"),
    });
    expect(days).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });
});

describe("netFlowSeries", () => {
  it("buckets created/resolved per day and fills gaps with zeros", () => {
    const window = {
      start: new Date("2026-06-01T00:00:00Z"),
      end: new Date("2026-06-03T00:00:00Z"),
    };
    const series = netFlowSeries(
      ["2026-06-01T05:00:00Z", "2026-06-01T09:00:00Z", "2026-06-03T01:00:00Z"],
      ["2026-06-01T10:00:00Z"],
      window,
    );
    expect(series).toHaveLength(3);
    expect(series[0]).toEqual({ date: "2026-06-01", created: 2, resolved: 1, net: 1 });
    expect(series[1]).toEqual({ date: "2026-06-02", created: 0, resolved: 0, net: 0 });
    expect(series[2]).toEqual({ date: "2026-06-03", created: 1, resolved: 0, net: 1 });
  });
});
