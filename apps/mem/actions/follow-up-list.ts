import type { ActionDefinition } from "@w6w/types";
import { call, pageList, pickQuery } from "../lib/client.ts";
import { limitParam, pageParam, select, str } from "../lib/params.ts";

/** `GET /v2/follow-ups` (Mem API v2). */
type Input = Record<string, unknown>;

const followUpList: ActionDefinition<Input> = {
  key: "follow-up-list",
  type: "read",
  resource: "follow-up",
  title: "List Follow-ups",
  description: "List follow-ups Mem has recorded, optionally by status, task or project.",
  params: [
    pageParam,
    limitParam,
    select("order_by", "Order by", [
      "created_at",
      "updated_at",
      "scheduled_for",
      "created_at_asc",
      "updated_at_asc",
      "scheduled_for_asc",
    ]),
    select("status", "Status", ["pending", "fired", "completed", "canceled"]),
    str("task_id", "Task ID"),
    str("project_id", "Project ID"),
  ],
  output: [
    { key: "items", type: "array", label: "Results of this page" },
    { key: "total", type: "number", label: "Total matching" },
    { key: "nextPage", type: "string", label: "Cursor for the next page, or null" },
    { key: "hasMore", type: "boolean", label: "Whether a further page exists" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/follow-ups`, {
      query: pickQuery(input, ["page", "limit", "order_by", "status", "task_id", "project_id"]),
    }).then(pageList);
  },
};

export default followUpList;
