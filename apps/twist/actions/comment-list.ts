import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/comments/get`
 *
 * List the comments in a thread.
 */
interface Input {
  threadId: number;
  newerThanTs?: number;
  olderThanTs?: number;
  fromObjIndex?: number;
  toObjIndex?: number;
  limit?: number;
  orderBy?: string;
  asIds?: boolean;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List the comments in a thread.",
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    { key: "newerThanTs", label: "Newer than (Unix time)", type: "number" },
    { key: "olderThanTs", label: "Older than (Unix time)", type: "number" },
    { key: "fromObjIndex", label: "From object index", type: "number" },
    { key: "toObjIndex", label: "To object index", type: "number" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum items to return (Twist default 20, maximum 500).",
    },
    {
      key: "orderBy",
      label: "Order",
      type: "select",
      hint: "`desc` (default) or `asc`.",
      options: [{ value: "desc", label: "desc" }, { value: "asc", label: "asc" }],
    },
    {
      key: "asIds",
      label: "Ids only",
      type: "boolean",
      hint: "Return only ids instead of full objects.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/comments/get",
      params: {
        "thread_id": input.threadId,
        "newer_than_ts": input.newerThanTs,
        "older_than_ts": input.olderThanTs,
        "from_obj_index": input.fromObjIndex,
        "to_obj_index": input.toObjIndex,
        "limit": input.limit,
        "order_by": input.orderBy,
        "as_ids": input.asIds,
      },
    });
  },
};

export default commentList;
