import type { ActionDefinition } from "@w6w/types";
import { IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";
import { CHART_PARAMS, chartBody } from "../lib/params.ts";
import type { ChartInput } from "../lib/params.ts";

/**
 * `POST /chart` — renders a Chart.js config to an image.
 *
 * The response is the image itself, so the bytes go to the run's file store. A bad config answers
 * 400 with an IMAGE of the error and the message in the `X-quickchart-error` header; the client
 * turns that header into the thrown message.
 */
const chartRender: ActionDefinition<ChartInput> = {
  key: "chart-render",
  type: "perform",
  resource: "chart",
  title: "Render Chart",
  description: "Render a Chart.js chart to a PNG, JPEG, WebP, SVG or PDF image.",
  idempotent: true,
  requiresAuth: false,
  params: [
    ...CHART_PARAMS,
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "png",
      hint: "Set it explicitly: when omitted a caller that accepts WebP may get WebP.",
      options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPEG" },
        { value: "webp", label: "WebP" },
        { value: "svg", label: "SVG" },
        { value: "pdf", label: "PDF" },
      ],
    },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    return await new QuickChartClient(ctx).image(
      "/chart",
      chartBody({ ...input, format: input.format ?? "png" }),
      "chart",
    );
  },
};

export default chartRender;
