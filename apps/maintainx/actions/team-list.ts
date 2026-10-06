import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/teams` */
interface Input {
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List Teams",
  description: "List teams (id and name).",
  params: [...paginationParams, organizationIdParam],
  output: [
    { key: "teams", type: "array", label: "Teams" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list(
      "/teams",
      "teams",
      { limit: input.limit, cursor: input.cursor },
      input.organizationId,
    );
  },
};

export default teamList;
