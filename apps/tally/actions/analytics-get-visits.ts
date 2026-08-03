import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam, periodParam } from "../lib/params.ts";

interface Input {
  formId: string;
  period: string;
}

/**
 * GET /forms/{formId}/analytics/visits — the visits time series.
 *
 * `data` is a map keyed by bucket, each `{ totalVisits }`; `interval` is the
 * bucket width the server chose for the requested period.
 */
const analyticsGetVisits: ActionDefinition<Input, Record<string, unknown>> = {
  key: "analytics-get-visits",
  type: "read",
  resource: "analytics",
  title: "Get Form Visits",
  description: "Visits over time for a form, bucketed by the server's chosen interval.",
  params: [formIdParam, periodParam],
  output: [
    { key: "data", type: "object", label: "Bucket -> { totalVisits }" },
    { key: "interval", type: "number", label: "Bucket interval" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<
      { data?: Record<string, unknown>; interval?: number }
    >(
      `/forms/${encodeURIComponent(input.formId)}/analytics/visits`,
      { query: { period: input.period } },
    );
    return { data: body?.data ?? {}, interval: body?.interval };
  },
};

export default analyticsGetVisits;
