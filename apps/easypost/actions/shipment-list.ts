import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/shipments` — recent shipments.
 *
 * `purchased` is the filter that matters. A workflow reconciling orders against
 * labels wants the ones **not** bought — shipments quoted and abandoned, which
 * is what a failed checkout or a cancelled order leaves behind. Nothing else
 * reports those, and they accumulate silently.
 *
 * This fetches a single page rather than walking, deliberately: EasyPost allows
 * only five requests a second across list endpoints, and a paging loop over a
 * busy account is the fastest way to a `429`.
 */
const action: ActionDefinition = {
  key: "shipment-list",
  type: "read",
  resource: "shipment",
  title: "List shipments",
  description:
    "Recent shipments. Filtering to the UNPURCHASED ones finds quotes that were abandoned — " +
    "what a cancelled order leaves behind, which nothing else reports.",
  params: [
    {
      key: "purchased",
      label: "Purchased",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All shipments" },
        { value: "true", label: "Purchased — a label exists" },
        { value: "false", label: "Not purchased — quoted and abandoned" },
      ],
    },
    { key: "startDatetime", label: "From", type: "datetime", default: "" },
    { key: "endDatetime", label: "To", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "shipments", type: "array", label: "Shipments" },
    { key: "count", type: "number", label: "Shipments returned" },
    { key: "has_more", type: "boolean", label: "More exist beyond this page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const purchased = String(p.purchased ?? "");

    const body = await new EasyPostClient(ctx).request<{
      shipments?: unknown[];
      has_more?: boolean;
    }>("/shipments", {
      query: query({
        purchased: purchased === "true" ? true : purchased === "false" ? false : undefined,
        start_datetime: p.startDatetime,
        end_datetime: p.endDatetime,
        page_size: Math.min(100, Math.max(1, Number(p.limit ?? 20))),
        before_id: p.beforeId,
      }),
    });

    const shipments = body?.shipments ?? [];
    return { shipments, count: shipments.length, has_more: body?.has_more === true };
  },
};

export default action;
