import type { ActionDefinition } from "@w6w/types";
import { call, pageList, pickQuery } from "../lib/client.ts";
import { limitParam, pageParam, select, str } from "../lib/params.ts";

/** `GET /v2/tasks` (Mem API v2). */
type Input = Record<string, unknown>;

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List tasks Mem has extracted from notes, optionally by status or project.",
  params: [
    pageParam,
    limitParam,
    select("order_by", "Order by", [
      "created_at",
      "updated_at",
      "created_at_asc",
      "updated_at_asc",
    ]),
    select("status", "Status", ["pending", "in_progress", "completed", "canceled"]),
    str("project_id", "Project ID"),
  ],
  output: [
    { key: "items", type: "array", label: "Results of this page" },
    { key: "total", type: "number", label: "Total matching" },
    { key: "nextPage", type: "string", label: "Cursor for the next page, or null" },
    { key: "hasMore", type: "boolean", label: "Whether a further page exists" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/tasks`, {
      query: pickQuery(input, ["page", "limit", "order_by", "status", "project_id"]),
    }).then(pageList);
  },
};

export default taskList;
