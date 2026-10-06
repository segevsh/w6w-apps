import type { ActionDefinition } from "@w6w/types";
import { compact, QuickChartClient } from "../lib/client.ts";

interface Input {
  description: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

/**
 * `POST /natural/config` — drafts a Chart.js config from a plain-English description.
 *
 * `chart` comes back as a STRING of Chart.js config (pretty-printed, leading newline), and the
 * vendor says to validate it before production use. `chartUrl` is a saved image URL.
 */
const chartDraftFromText: ActionDefinition<Input> = {
  key: "chart-draft-from-text",
  type: "perform",
  resource: "chart",
  title: "Draft Chart From Description",
  description: "Draft a Chart.js config (and a saved image URL) from a plain-English description.",
  idempotent: false,
  requiresAuth: false,
  params: [
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      hint: 'e.g. "bar chart of revenue Jan-Mar with values 120, 150, 180"',
    },
    { key: "width", label: "Width (px)", type: "number", validation: { min: 1, integer: true } },
    { key: "height", label: "Height (px)", type: "number", validation: { min: 1, integer: true } },
    { key: "backgroundColor", label: "Background colour", type: "string" },
  ],
  output: [
    { key: "chart", type: "string", label: "Chart.js config" },
    { key: "chartUrl", type: "string", label: "Saved chart image URL" },
    { key: "chartMakerUrl", type: "string", label: "Chart editor URL" },
    { key: "warnings", type: "array", label: "Warnings" },
  ],

  async execute(input, ctx) {
    const res = await new QuickChartClient(ctx).json<Record<string, unknown>>(
      "/natural/config",
      compact({ ...input }),
    );
    return {
      chart: typeof res.chart === "string" ? res.chart.trim() : res.chart,
      chartUrl: res.chartUrl,
      chartMakerUrl: res.chartMakerUrl,
      warnings: Array.isArray(res.warnings) ? res.warnings : [],
    };
  },
};

export default chartDraftFromText;
