import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam, periodParam } from "../lib/params.ts";

interface Input {
  formId: string;
  period: string;
}

/**
 * GET /forms/{formId}/analytics/dimensions — audience breakdowns.
 *
 * Each documented dimension (`source`, `browser`, `os`, `device`, `country`,
 * `city`, …) is a map of value -> count. The whole object is returned rather
 * than a fixed subset, so a dimension Tally adds later still reaches the
 * caller.
 */
const analyticsGetDimensions: ActionDefinition<Input, Record<string, unknown>> = {
  key: "analytics-get-dimensions",
  type: "read",
  resource: "analytics",
  title: "Get Form Dimensions",
  description:
    "Audience breakdowns for a form — source, browser, OS, device, country, city — each as value -> count.",
  params: [formIdParam, periodParam],
  output: [
    { key: "source", type: "object", label: "Referrer source -> count" },
    { key: "browser", type: "object", label: "Browser -> count" },
    { key: "os", type: "object", label: "OS -> count" },
    { key: "device", type: "object", label: "Device -> count" },
    { key: "country", type: "object", label: "Country -> count" },
    { key: "dimensions", type: "object", label: "The full dimensions object" },
  ],

  async execute(input, ctx) {
    const dimensions = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/forms/${encodeURIComponent(input.formId)}/analytics/dimensions`,
      { query: { period: input.period } },
    );
    return {
      source: dimensions?.source,
      browser: dimensions?.browser,
      os: dimensions?.os,
      device: dimensions?.device,
      country: dimensions?.country,
      dimensions,
    };
  },
};

export default analyticsGetDimensions;
