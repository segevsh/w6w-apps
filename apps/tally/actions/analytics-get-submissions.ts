import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam, periodParam } from "../lib/params.ts";

interface Input {
  formId: string;
  period: string;
}

/**
 * GET /forms/{formId}/analytics/submissions — the submissions time series.
 *
 * `data` is a map keyed by bucket, each `{ completed, partial }` — the same
 * completed/partial split the submissions list filters on.
 */
const analyticsGetSubmissions: ActionDefinition<Input, Record<string, unknown>> = {
  key: "analytics-get-submissions",
  type: "read",
  resource: "analytics",
  title: "Get Form Submission Analytics",
  description: "Completed and partial submissions over time for a form.",
  params: [formIdParam, periodParam],
  output: [
    { key: "data", type: "object", label: "Bucket -> { completed, partial }" },
    { key: "interval", type: "number", label: "Bucket interval" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<
      { data?: Record<string, unknown>; interval?: number }
    >(
      `/forms/${encodeURIComponent(input.formId)}/analytics/submissions`,
      { query: { period: input.period } },
    );
    return { data: body?.data ?? {}, interval: body?.interval };
  },
};

export default analyticsGetSubmissions;
