import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /shipments` — list shipments. The list documents no order; `objectCreatedGte`
 * (`object_created_gte`, ISO 8601 UTC) restricts it to shipments created at or after a time.
 */
const action: ActionDefinition = {
  key: "shipment-list",
  type: "read",
  resource: "shipment",
  title: "List shipments",
  description: "List shipments on this account.",
  params: [
    ...LIST_PARAMS,
    {
      key: "objectCreatedGte",
      label: "Created at or after",
      type: "string",
      advanced: true,
      placeholder: "2026-11-09T12:00:00Z",
      hint: "ISO 8601 UTC date-time (no timezone offsets); sent as `object_created_gte`.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Shipments" },
    { key: "next", type: "string", label: "URL of the next page, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const list = await new ShippoClient(ctx).request("/shipments", {
      query: compact({
        results: p.results,
        page: p.page,
        object_created_gte: p.objectCreatedGte,
      }),
    }) as { results?: unknown[]; next?: string | null };

    ctx.log("info", "listed Shippo shipments", { count: list?.results?.length ?? 0 });
    return list;
  },
};

export default action;
