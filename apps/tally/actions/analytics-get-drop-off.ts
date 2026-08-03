import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam, periodParam } from "../lib/params.ts";

interface Input {
  formId: string;
  period: string;
}

/**
 * GET /forms/{formId}/analytics/drop-off — where respondents abandon the form.
 *
 * The 200 body is declared `nullable` in the OpenAPI: a form with no analytics
 * yet answers `null` rather than an empty object, so that case is normalised to
 * `available: false` instead of throwing.
 */
const analyticsGetDropOff: ActionDefinition<Input, Record<string, unknown>> = {
  key: "analytics-get-drop-off",
  type: "read",
  resource: "analytics",
  title: "Get Form Drop-off",
  description: "Per-step drop-off for a form, with the funnel stats behind it.",
  params: [formIdParam, periodParam],
  output: [
    { key: "available", type: "boolean", label: "Whether drop-off data exists yet" },
    { key: "stats", type: "object", label: "Funnel stats (visitors, starts, completes, rate)" },
    { key: "data", type: "array", label: "Per-step drop-off" },
    { key: "dataAvailableSince", type: "string", label: "Earliest instant with data" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<
      {
        stats?: Record<string, unknown>;
        data?: unknown[];
        dataAvailableSince?: string;
      } | null
    >(
      `/forms/${encodeURIComponent(input.formId)}/analytics/drop-off`,
      { query: { period: input.period } },
    );
    // Documented as nullable: a form with no analytics yet returns null.
    if (!body) {
      return { available: false, stats: undefined, data: [], dataAvailableSince: undefined };
    }
    return {
      available: true,
      stats: body.stats,
      data: body.data ?? [],
      dataAvailableSince: body.dataAvailableSince,
    };
  },
};

export default analyticsGetDropOff;
