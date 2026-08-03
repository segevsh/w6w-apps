import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam, periodParam } from "../lib/params.ts";

interface Input {
  formId: string;
  period: string;
}

/**
 * GET /forms/{formId}/analytics/metrics — headline funnel numbers for a period.
 *
 * One flat object: visits, visitDuration, submissions, uniqueRespondents,
 * totalViews, starts, completions, completionDuration, completionRate.
 */
const analyticsGetMetrics: ActionDefinition<Input, Record<string, unknown>> = {
  key: "analytics-get-metrics",
  type: "read",
  resource: "analytics",
  title: "Get Form Metrics",
  description: "Headline analytics for a form over a period: visits, starts, completions, rate.",
  params: [formIdParam, periodParam],
  output: [
    { key: "visits", type: "number", label: "Visits" },
    { key: "submissions", type: "number", label: "Submissions" },
    { key: "uniqueRespondents", type: "number", label: "Unique respondents" },
    { key: "totalViews", type: "number", label: "Total views" },
    { key: "starts", type: "number", label: "Starts" },
    { key: "completions", type: "number", label: "Completions" },
    { key: "completionRate", type: "number", label: "Completion rate" },
    { key: "metrics", type: "object", label: "The full metrics object" },
  ],

  async execute(input, ctx) {
    const metrics = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/forms/${encodeURIComponent(input.formId)}/analytics/metrics`,
      { query: { period: input.period } },
    );
    return {
      visits: metrics?.visits,
      submissions: metrics?.submissions,
      uniqueRespondents: metrics?.uniqueRespondents,
      totalViews: metrics?.totalViews,
      starts: metrics?.starts,
      completions: metrics?.completions,
      completionRate: metrics?.completionRate,
      metrics,
    };
  },
};

export default analyticsGetMetrics;
