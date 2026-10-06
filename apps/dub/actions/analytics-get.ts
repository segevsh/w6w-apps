import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";
import { FILTER_PARAMS, filterQuery } from "../lib/filters.ts";

type Input = Record<string, unknown> & { event?: string; groupBy?: string };

const GROUP_BY = [
  "count",
  "timeseries",
  "continents",
  "regions",
  "countries",
  "cities",
  "devices",
  "browsers",
  "os",
  "trigger",
  "triggers",
  "event_names",
  "referers",
  "referer_urls",
  "top_folders",
  "top_link_tags",
  "top_domains",
  "top_links",
  "top_urls",
  "top_base_urls",
  "utm_sources",
  "utm_mediums",
  "utm_campaigns",
  "utm_terms",
  "utm_contents",
];

/**
 * `GET /analytics`. The response shape depends on `groupBy` (an object for
 * `count`, an array for everything else), so it is returned under `result`.
 * The partner-program groupings (`top_partners`, `top_groups`,
 * `top_partner_tags`) and filters are not exposed. Dub rate-limits this
 * endpoint separately and per second, and not at all on the Free plan.
 */
const analyticsGet: ActionDefinition<Input> = {
  key: "analytics-get",
  type: "read",
  resource: "analytics",
  title: "Get Analytics",
  description:
    "Retrieve click, lead or sale analytics for a link, a domain or the whole workspace, optionally grouped (time series, country, device, referrer, UTM, top links…). Requires a paid Dub plan.",
  params: [
    {
      key: "event",
      label: "Event",
      type: "select",
      options: [
        { value: "clicks", label: "Clicks" },
        { value: "leads", label: "Leads" },
        { value: "sales", label: "Sales" },
        { value: "composite", label: "Composite (all three)" },
      ],
      hint: "Defaults to clicks.",
    },
    {
      key: "groupBy",
      label: "Group by",
      type: "select",
      options: GROUP_BY.map((value) => ({ value, label: value })),
      hint: "Defaults to count (one total).",
    },
    ...FILTER_PARAMS,
  ],
  output: [{
    key: "result",
    type: "object",
    label: "An object for `count`, otherwise an array of grouped rows",
  }],

  async execute(input, ctx) {
    const result = await new DubClient(ctx).request("GET", "/analytics", {
      query: { event: input.event, groupBy: input.groupBy, ...filterQuery(input) },
    });
    return { result };
  },
};

export default analyticsGet;
