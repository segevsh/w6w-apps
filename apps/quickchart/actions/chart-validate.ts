import type { ActionDefinition } from "@w6w/types";
import { QuickChartClient } from "../lib/client.ts";
import { CHART_PARAMS, chartBody } from "../lib/params.ts";
import type { ChartInput } from "../lib/params.ts";

interface ValidateResponse {
  success?: boolean;
  errors?: string[];
  warnings?: string[];
  normalized?: Record<string, unknown>;
  renderCheck?: { contentType?: string; bytes?: number };
}

/**
 * `POST /api/validate-chart` — renders the chart and discards the image, answering JSON.
 *
 * An invalid config is HTTP 400 with `{success: false, errors: [...]}`; that is the answer this
 * action exists to report, so 400 comes back as data (`valid: false`), not as an exception. 403 and
 * 429 still throw. Warnings are worth reading even on success (v3/v4 options sent with the default
 * v2, external data that should be cached briefly).
 */
const chartValidate: ActionDefinition<ChartInput> = {
  key: "chart-validate",
  type: "read",
  resource: "chart",
  title: "Validate Chart",
  description: "Check a Chart.js config renders, and get errors and warnings as JSON.",
  requiresAuth: false,
  params: CHART_PARAMS,
  output: [
    { key: "valid", type: "boolean", label: "Valid" },
    { key: "errors", type: "array", label: "Errors" },
    { key: "warnings", type: "array", label: "Warnings" },
    { key: "normalized", type: "object", label: "Normalized request" },
    { key: "renderCheck", type: "object", label: "Render check" },
  ],

  async execute(input, ctx) {
    const res = await new QuickChartClient(ctx).json<ValidateResponse>(
      "/api/validate-chart",
      chartBody(input),
      { accept: [400] },
    );
    return {
      valid: res.success === true,
      errors: res.errors ?? [],
      warnings: res.warnings ?? [],
      normalized: res.normalized ?? {},
      renderCheck: res.renderCheck ?? null,
    };
  },
};

export default chartValidate;
