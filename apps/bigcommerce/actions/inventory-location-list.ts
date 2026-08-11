import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, bool } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/inventory/locations` — the store's inventory locations.
 *
 * Every relative inventory adjustment requires a `location_id`, and this is where
 * it comes from. A single-location store still has one, so this is not an
 * enterprise-only detour.
 *
 * `managed_by_external_source` is the filter worth knowing: a location fed by an
 * external WMS should generally not also be adjusted from a workflow, and this is
 * how to tell which those are before writing to one.
 */
interface Input {
  locationIds?: string;
  locationCodes?: string;
  isActive?: boolean;
  managedByExternalSource?: boolean;
  limit?: number;
  page?: number;
}

const inventoryLocationList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "inventory-location-list",
  type: "search",
  resource: "inventory",
  title: "List Inventory Locations",
  description:
    "The store's inventory locations — the source of the location_id an adjustment needs.",
  params: [
    {
      key: "locationIds",
      label: "Location IDs",
      type: "string",
      hint: "Comma-separated. Sent as `location_id:in`.",
    },
    {
      key: "locationCodes",
      label: "Location codes",
      type: "string",
      hint: "Comma-separated. Sent as `location_code:in`.",
    },
    { key: "isActive", label: "Active only", type: "boolean" },
    {
      key: "managedByExternalSource",
      label: "Managed by an external source",
      type: "boolean",
      advanced: true,
      hint: "Locations fed by an external system. Adjusting one from a workflow will fight it.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Locations" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/inventory/locations", {
      query: {
        "location_id:in": input.locationIds,
        "location_code:in": input.locationCodes,
        is_active: bool(input.isActive),
        managed_by_external_source: bool(input.managedByExternalSource),
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default inventoryLocationList;
