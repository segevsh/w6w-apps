import type { ActionDefinition } from "@w6w/types";
import { encodeId, isoDate, PerspectiveClient, requireString } from "../lib/client.ts";
import {
  chartSubtypeOptions,
  fromParam,
  funnelIdParam,
  offsetParam,
  toParam,
} from "../lib/params.ts";

/**
 * `GET /v1/funnels/{funnelId}/metrics/charts/{subtype}` — a chart series.
 *
 * `abTest` (all | original | variant) is valid ONLY for
 * `chart_page_to_page_conversion_rate`; the API answers 400 for any other
 * subtype, so this action refuses it before sending.
 */
interface Input {
  funnelId: string;
  subtype: string;
  from: string;
  to: string;
  offset?: string;
  abTest?: string;
}

const PAGE_TO_PAGE = "chart_page_to_page_conversion_rate";

const chartGet: ActionDefinition<Input> = {
  key: "chart-get",
  type: "read",
  resource: "metric",
  title: "Get Chart",
  description:
    "Read a funnel chart series (page conversion, devices, UTM sources, ...) for a period.",
  params: [
    funnelIdParam,
    {
      key: "subtype",
      label: "Chart",
      type: "select",
      required: true,
      options: chartSubtypeOptions,
    },
    fromParam,
    toParam,
    offsetParam,
    {
      key: "abTest",
      label: "A/B test filter",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "original", label: "Original" },
        { value: "variant", label: "Variant" },
      ],
      hint: "Only valid for the page-to-page conversion chart.",
      showIf: { "==": [{ var: "subtype" }, PAGE_TO_PAGE] },
    },
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Data points",
    },
  ],

  async execute(input, ctx) {
    const funnelId = encodeId(requireString(input.funnelId, "funnelId"));
    const subtypeRaw = requireString(input.subtype, "subtype");
    const from = isoDate(input.from, "from");
    const to = isoDate(input.to, "to");
    if (from >= to) throw new Error("from must be before to");
    const abTest = input.abTest?.trim() || undefined;
    if (abTest !== undefined) {
      if (subtypeRaw !== PAGE_TO_PAGE) {
        throw new Error(`abTest is only valid for ${PAGE_TO_PAGE}`);
      }
      if (!["all", "original", "variant"].includes(abTest)) {
        throw new Error("abTest must be all, original or variant");
      }
    }
    const data = await new PerspectiveClient(ctx).data(
      `/funnels/${funnelId}/metrics/charts/${encodeId(subtypeRaw)}`,
      { query: { from, to, offset: input.offset?.toString().trim(), abTest } },
    );
    return { data };
  },
};

export default chartGet;
