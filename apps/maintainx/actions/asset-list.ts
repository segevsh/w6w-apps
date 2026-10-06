import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient, toList } from "../lib/client.ts";
import { expandParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/assets` */
interface Input {
  locationId?: number;
  manufacturer?: string;
  model?: string;
  updatedAfter?: string;
  createdAfter?: string;
  sort?: string;
  expand?: string;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const assetList: ActionDefinition<Input> = {
  key: "asset-list",
  type: "search",
  resource: "asset",
  title: "List Assets",
  description: "List assets, optionally filtered by location, manufacturer, model or date.",
  params: [
    { key: "locationId", label: "Location ID", type: "number" },
    { key: "manufacturer", label: "Manufacturers", type: "string", hint: "Comma-separated." },
    { key: "model", label: "Models", type: "string", hint: "Comma-separated." },
    { key: "updatedAfter", label: "Updated at or after", type: "datetime" },
    { key: "createdAfter", label: "Created at or after", type: "datetime" },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: ["id", "createdAt", "updatedAt"].flatMap((f) => [
        { value: f, label: `${f} (ascending)` },
        { value: `-${f}`, label: `${f} (descending)` },
      ]),
    },
    expandParam([
      "barcode",
      "team_ids",
      "asset_types",
      "extra_fields",
      "vendor_ids",
      "depreciation",
      "status",
      "manufacturer",
      "model",
    ]),
    ...paginationParams,
    organizationIdParam,
  ],
  output: [
    { key: "assets", type: "array", label: "Assets" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list("/assets", "assets", {
      locationId: input.locationId,
      manufacturer: toList(input.manufacturer),
      model: toList(input.model),
      "updatedAt[gte]": input.updatedAfter,
      "createdAt[gte]": input.createdAfter,
      sort: input.sort,
      expand: toList(input.expand),
      limit: input.limit,
      cursor: input.cursor,
    }, input.organizationId);
  },
};

export default assetList;
