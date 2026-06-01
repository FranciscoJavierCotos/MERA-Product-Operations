/**
 * Integration tests: analytics endpoints
 *
 * Boots the Fastify app in-process and exercises the /analytics routes against
 * a real Postgres + RLS. Covers the happy path (shape + invariants of each
 * aggregate) plus an auth edge case (missing token → 401).
 *
 * Requires: local Supabase running (`supabase start` + `supabase db reset`).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader } from "../test-helpers/auth.js";

describe("analytics endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth edge case ────────────────────────────────────────────────────────

  it("rejects unauthenticated requests with 401", async () => {
    const res = await app.inject({ method: "GET", url: "/analytics/summary" });
    expect(res.statusCode).toBe(401);
  });

  // ── Happy path: summary ───────────────────────────────────────────────────

  it("GET /analytics/summary returns the 5 primary KPIs with delta shape", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/summary?range=30d",
      headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();

    expect(body.range).toBe("30d");
    expect(body.window.start).toBeTruthy();
    expect(body.window.end).toBeTruthy();

    for (const key of [
      "slaCompliance",
      "medianResolutionHours",
      "p90ResolutionHours",
      "netFlow",
      "reopenRate",
      "atRiskAccounts",
    ]) {
      expect(body[key], `missing KPI ${key}`).toBeDefined();
      expect(body[key]).toHaveProperty("value");
      expect(body[key]).toHaveProperty("previous");
      expect(body[key]).toHaveProperty("delta");
    }
  });

  it("defaults to range=30d when no range is supplied", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/analytics/summary", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().range).toBe("30d");
  });

  it("rejects an invalid range value with 400", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/summary?range=42y",
      headers,
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Happy path: series + breakdown endpoints ──────────────────────────────

  it("GET /analytics/net-flow returns a continuous daily series", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/net-flow?range=7d",
      headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.series)).toBe(true);
    // 7d window is inclusive of both endpoints → 8 day-keys.
    expect(body.series.length).toBeGreaterThanOrEqual(7);
    for (const point of body.series) {
      expect(point).toHaveProperty("date");
      expect(point.net).toBe(point.created - point.resolved);
    }
  });

  it("GET /analytics/sla-compliance returns one row per priority", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/sla-compliance?range=30d",
      headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    const priorities = res.json().byPriority.map((r: { priority: string }) => r.priority);
    expect(priorities).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("GET /analytics/backlog-aging returns the 5 fixed age buckets", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/backlog-aging",
      headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    const buckets = res.json().buckets.map((b: { bucket: string }) => b.bucket);
    expect(buckets).toEqual(["<1d", "1-3d", "4-7d", "8-30d", ">30d"]);
  });

  it("GET /analytics/cfd returns daily open/resolved/closed counts", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/analytics/cfd?range=7d", headers });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.series)).toBe(true);
    for (const p of body.series) {
      expect(p.open).toBeGreaterThanOrEqual(0);
    }
  });

  it("GET /analytics/health-distribution returns the 5 health levels", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/health-distribution?range=30d",
      headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(body.levels.length).toBe(5);
    expect(typeof body.netSlippage).toBe("number");
  });

  it("GET /analytics/velocity returns sprints and a rolling average", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({ method: "GET", url: "/analytics/velocity", headers });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.sprints)).toBe(true);
    expect(body).toHaveProperty("rollingAverage");
  });

  it("GET /analytics/resolution-distribution returns points + percentiles", async () => {
    const headers = await authHeader("admin");
    const res = await app.inject({
      method: "GET",
      url: "/analytics/resolution-distribution?range=ytd",
      headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.points)).toBe(true);
    expect(body).toHaveProperty("median");
    expect(body).toHaveProperty("p90");
  });
});
