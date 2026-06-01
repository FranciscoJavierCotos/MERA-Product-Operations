import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as analytics from "../services/analytics.js";

const RangeQuery = z.object({
  range: z.enum(["7d", "30d", "qtd", "ytd"]).default("30d"),
});

const VelocityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

/**
 * Analytics endpoints — range-scoped, filter-aware aggregates for the
 * `/analytics` reporting hub. Every read goes through the per-request
 * JWT-scoped Supabase client so RLS stays the source of truth.
 */
export const analyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/analytics/summary",
    { schema: { tags: ["analytics"], querystring: RangeQuery } },
    async (req) => analytics.getAnalyticsSummary(req.supabase, req.query.range),
  );

  app.get(
    "/analytics/net-flow",
    { schema: { tags: ["analytics"], querystring: RangeQuery } },
    async (req) => analytics.getNetFlow(req.supabase, req.query.range),
  );

  app.get(
    "/analytics/sla-compliance",
    { schema: { tags: ["analytics"], querystring: RangeQuery } },
    async (req) => analytics.getSlaCompliance(req.supabase, req.query.range),
  );

  app.get(
    "/analytics/cfd",
    { schema: { tags: ["analytics"], querystring: RangeQuery } },
    async (req) => analytics.getCfd(req.supabase, req.query.range),
  );

  app.get(
    "/analytics/backlog-aging",
    { schema: { tags: ["analytics"] } },
    async (req) => analytics.getBacklogAging(req.supabase),
  );

  app.get(
    "/analytics/resolution-distribution",
    { schema: { tags: ["analytics"], querystring: RangeQuery } },
    async (req) =>
      analytics.getResolutionDistribution(req.supabase, req.query.range),
  );

  app.get(
    "/analytics/health-distribution",
    { schema: { tags: ["analytics"], querystring: RangeQuery } },
    async (req) => analytics.getHealthDistribution(req.supabase, req.query.range),
  );

  app.get(
    "/analytics/velocity",
    { schema: { tags: ["analytics"], querystring: VelocityQuery } },
    async (req) => analytics.getVelocity(req.supabase, req.query.limit),
  );
};
