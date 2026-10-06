import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, pick } from "../lib/client.ts";
import { blogId, metricParams, metricQueryKeys, str } from "../lib/params.ts";

type Input = {
  blogId: string;
  competitorId: string;
  network: string;
  metric: string;
  from: string;
  to: string;
  timezone?: string;
  subject?: string;
  scope?: string;
};

/** `GET /v2/analytics/competitors/{competitorId}/aggregation`. */
const competitorAggregation: ActionDefinition<Input> = {
  key: "competitor-aggregation",
  type: "read",
  resource: "competitor",
  title: "Get Competitor Metric Total",
  description: "A competitor's single aggregated metric value over a period.",
  params: [
    blogId,
    str("competitorId", "Competitor ID", { required: true, hint: "An id from List Competitors." }),
    ...metricParams,
  ],
  output: [{ key: "value", type: "number", label: "Aggregated value" }],

  async execute(input, ctx) {
    const data = await call(
      ctx,
      "GET",
      `/v2/analytics/competitors/${encodeId(input.competitorId)}/aggregation`,
      { blogId: input.blogId, query: pick(input, metricQueryKeys) as Record<string, string> },
    );
    return { value: typeof data === "number" ? data : null };
  },
};

export default competitorAggregation;
