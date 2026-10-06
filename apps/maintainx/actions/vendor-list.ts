import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/vendors` */
interface Input {
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const vendorList: ActionDefinition<Input> = {
  key: "vendor-list",
  type: "search",
  resource: "vendor",
  title: "List Vendors",
  description: "List vendors.",
  params: [...paginationParams, organizationIdParam],
  output: [
    { key: "vendors", type: "array", label: "Vendors" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list(
      "/vendors",
      "vendors",
      { limit: input.limit, cursor: input.cursor },
      input.organizationId,
    );
  },
};

export default vendorList;
