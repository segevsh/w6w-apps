import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/trackers` — every parcel in flight.
 *
 * The sweep behind an exceptions report. Filtering by `tracking_code` finds one
 * parcel; leaving it off and reading the statuses finds the ones nobody is
 * watching — returning to sender, failed, or sitting at `pre_transit` a week
 * after the label was bought because the parcel was never handed over.
 *
 * That last one is worth naming: a label bought and never used costs money, and
 * nothing reports it. This action counts the statuses so that shows up without
 * a caller tallying them.
 */
const action: ActionDefinition = {
  key: "tracker-list",
  type: "read",
  resource: "tracker",
  title: "List trackers",
  description:
    "Parcels in flight, with the statuses tallied. A label bought and never handed over sits at " +
    "`pre_transit` forever, costs money, and nothing else reports it.",
  params: [
    {
      key: "trackingCode",
      label: "Tracking Number",
      type: "string",
      default: "",
      hint: "Find the tracker for one parcel.",
    },
    { key: "carrier", label: "Carrier", type: "string", default: "", advanced: true },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "trackers", type: "array", label: "Trackers" },
    { key: "count", type: "number", label: "Trackers returned" },
    { key: "statusCounts", type: "object", label: "How many in each status" },
    { key: "has_more", type: "boolean", label: "More exist beyond this page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const body = await new EasyPostClient(ctx).request<{
      trackers?: Array<{ status?: string }>;
      has_more?: boolean;
    }>("/trackers", {
      query: query({
        tracking_code: p.trackingCode,
        carrier: p.carrier,
        page_size: Math.min(100, Math.max(1, Number(p.limit ?? 20))),
        before_id: p.beforeId,
      }),
    });

    const trackers = body?.trackers ?? [];
    const statusCounts: Record<string, number> = {};
    for (const t of trackers) {
      const status = String(t?.status ?? "unknown");
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    return {
      trackers,
      count: trackers.length,
      statusCounts,
      has_more: body?.has_more === true,
    };
  },
};

export default action;
