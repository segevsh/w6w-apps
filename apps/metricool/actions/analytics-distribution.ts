import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { blogId, metricParams, metricQueryKeys } from "../lib/params.ts";

type Input = { blogId: string; network: string; metric: string; from: string; to: string } & {
  timezone?: string;
  subject?: string;
  scope?: string;
};

/** `GET /v2/analytics/distribution`. */
const analyticsDistribution: ActionDefinition<Input> = {
  key: "analytics-distribution",
  type: "read",
  resource: "analytics",
  title: "Get Metric Distribution",
  description: "A metric's breakdown (key/value pairs) for a brand on one network over a period.",
  params: [blogId, ...metricParams],
  output: [
    { key: "items", type: "array", label: "Distribution rows: {key, value}" },
    { key: "count", type: "number", label: "Number of rows" },
  ],

  async execute(input, ctx) {
    const data = await call(ctx, "GET", "/v2/analytics/distribution", {
      blogId: input.blogId,
      query: pick(input, metricQueryKeys) as Record<string, string>,
    });
    const items = Array.isArray(data) ? data : [];
    return { items, count: items.length };
  },
};

export default analyticsDistribution;
