import type { ActionDefinition } from "@w6w/types";
import { call, pageList, pickQuery } from "../lib/client.ts";
import { limitParam, pageParam, select } from "../lib/params.ts";

/** `GET /v2/projects` (Mem API v2). */
type Input = Record<string, unknown>;

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List projects Mem has identified across notes, optionally by status.",
  params: [
    pageParam,
    limitParam,
    select("order_by", "Order by", [
      "created_at",
      "updated_at",
      "created_at_asc",
      "updated_at_asc",
    ]),
    select("status", "Status", ["active", "resolved", "archived"]),
  ],
  output: [
    { key: "items", type: "array", label: "Results of this page" },
    { key: "total", type: "number", label: "Total matching" },
    { key: "nextPage", type: "string", label: "Cursor for the next page, or null" },
    { key: "hasMore", type: "boolean", label: "Whether a further page exists" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/projects`, {
      query: pickQuery(input, ["page", "limit", "order_by", "status"]),
    }).then(pageList);
  },
};

export default projectList;
