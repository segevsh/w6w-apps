import type { ActionDefinition } from "@w6w/types";
import { QuickChartClient } from "../lib/client.ts";
import { CHART_PARAMS, chartBody } from "../lib/params.ts";
import type { ChartInput } from "../lib/params.ts";

/**
 * `POST /chart/create` — saves a chart and answers `{success, url}` with a short
 * `https://quickchart.io/chart/render/<id>` URL.
 *
 * The request is NOT validated at creation: the chart is only rendered when the URL is first
 * visited, so a broken config still returns a URL. Run "Validate Chart" first when that matters.
 * Saved charts expire after 3 days (free) or 6 months (paid key); an expired URL is a 404.
 */
const chartUrlCreate: ActionDefinition<ChartInput> = {
  key: "chart-url-create",
  type: "perform",
  resource: "chart",
  title: "Create Chart Short URL",
  description: "Save a Chart.js chart and get a short URL that renders it, for email, SMS or chat.",
  idempotent: false,
  requiresAuth: false,
  params: [
    ...CHART_PARAMS,
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "png",
      options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPEG" },
        { value: "webp", label: "WebP" },
        { value: "svg", label: "SVG" },
        { value: "pdf", label: "PDF" },
      ],
    },
  ],
  output: [
    { key: "url", type: "string", label: "Short URL" },
    { key: "viewUrl", type: "string", label: "Interactive viewer URL" },
  ],

  async execute(input, ctx) {
    const res = await new QuickChartClient(ctx).json<{ success?: boolean; url?: string }>(
      "/chart/create",
      chartBody(input),
    );
    if (!res.url) throw new Error("QuickChart /chart/create answered without a url");
    // The interactive (tooltips) viewer lives at /chart-maker/view/<id> for the same id.
    const id = res.url.split("/chart/render/")[1];
    return {
      url: res.url,
      viewUrl: id ? `https://quickchart.io/chart-maker/view/${id}` : undefined,
    };
  },
};

export default chartUrlCreate;
