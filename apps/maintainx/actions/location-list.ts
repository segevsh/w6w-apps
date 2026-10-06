import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient, toList } from "../lib/client.ts";
import { expandParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/locations` */
interface Input {
  name?: string;
  expand?: string;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const locationList: ActionDefinition<Input> = {
  key: "location-list",
  type: "search",
  resource: "location",
  title: "List Locations",
  description: "List locations, optionally filtered by name.",
  params: [
    { key: "name", label: "Name", type: "string" },
    expandParam(["extra_fields", "team_ids", "vendor_ids", "barcode"]),
    ...paginationParams,
    organizationIdParam,
  ],
  output: [
    { key: "locations", type: "array", label: "Locations" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list("/locations", "locations", {
      name: input.name,
      expand: toList(input.expand),
      limit: input.limit,
      cursor: input.cursor,
    }, input.organizationId);
  },
};

export default locationList;
