import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/organizations` */
interface Input {
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const organizationList: ActionDefinition<Input> = {
  key: "organization-list",
  type: "search",
  resource: "organization",
  title: "List Organizations",
  description: "List the organizations this API key can access.",
  params: [...paginationParams, organizationIdParam],
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list(
      "/organizations",
      "organizations",
      { limit: input.limit, cursor: input.cursor },
      input.organizationId,
    );
  },
};

export default organizationList;
