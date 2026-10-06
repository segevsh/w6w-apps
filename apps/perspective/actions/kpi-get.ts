import type { ActionDefinition } from "@w6w/types";
import { encodeId, isoDate, PerspectiveClient, requireString } from "../lib/client.ts";
import {
  fromParam,
  funnelIdParam,
  kpiSubtypeOptions,
  offsetParam,
  toParam,
} from "../lib/params.ts";

/**
 * `GET /v1/funnels/{funnelId}/metrics/kpis/{subtype}` — one KPI over a window.
 *
 * `value` is a percentage for the rate KPIs, seconds for the time KPIs and a
 * raw count for the count KPIs; `count` (the sample size) exists only on rate
 * KPIs.
 */
interface Input {
  funnelId: string;
  subtype: string;
  from: string;
  to: string;
  offset?: string;
}

const kpiGet: ActionDefinition<Input> = {
  key: "kpi-get",
  type: "read",
  resource: "metric",
  title: "Get KPI",
  description: "Read one funnel KPI (conversion rate, sessions, new contacts, ...) for a period.",
  params: [
    funnelIdParam,
    {
      key: "subtype",
      label: "KPI",
      type: "select",
      required: true,
      options: kpiSubtypeOptions,
    },
    fromParam,
    toParam,
    offsetParam,
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "KPI",
    },
  ],

  async execute(input, ctx) {
    const funnelId = encodeId(requireString(input.funnelId, "funnelId"));
    const subtype = encodeId(requireString(input.subtype, "subtype"));
    const from = isoDate(input.from, "from");
    const to = isoDate(input.to, "to");
    if (from >= to) throw new Error("from must be before to");
    const data = await new PerspectiveClient(ctx).data(
      `/funnels/${funnelId}/metrics/kpis/${subtype}`,
      { query: { from, to, offset: input.offset?.toString().trim() } },
    );
    return { data };
  },
};

export default kpiGet;
