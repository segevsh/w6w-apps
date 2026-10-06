import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `GET /api/v3/inbox/get`
 *
 * List the threads in the user's inbox for a workspace.
 */
interface Input {
  workspaceId: number;
  limit?: number;
  newerThanTs?: number;
  olderThanTs?: number;
  archiveFilter?: string;
  orderBy?: string;
  excludeThreadIds?: string;
}

const inboxList: ActionDefinition<Input> = {
  key: "inbox-list",
  type: "read",
  resource: "inbox",
  title: "List Inbox",
  description: "List the threads in the user's inbox for a workspace.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum items to return (Twist default 30, maximum 500).",
    },
    { key: "newerThanTs", label: "Newer than (Unix time)", type: "number" },
    { key: "olderThanTs", label: "Older than (Unix time)", type: "number" },
    {
      key: "archiveFilter",
      label: "Archive filter",
      type: "select",
      hint: "`active` (default), `archived` or `all`.",
      options: [{ value: "active", label: "active" }, { value: "archived", label: "archived" }, {
        value: "all",
        label: "all",
      }],
    },
    {
      key: "orderBy",
      label: "Order",
      type: "select",
      hint: "`desc` (default) or `asc`.",
      options: [{ value: "desc", label: "desc" }, { value: "asc", label: "asc" }],
    },
    {
      key: "excludeThreadIds",
      label: "Exclude thread IDs",
      type: "string",
      hint: "Comma-separated thread ids to leave out.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/inbox/get",
      params: {
        "workspace_id": input.workspaceId,
        "limit": input.limit,
        "newer_than_ts": input.newerThanTs,
        "older_than_ts": input.olderThanTs,
        "archive_filter": input.archiveFilter,
        "order_by": input.orderBy,
        "exclude_thread_ids": idList(input.excludeThreadIds),
      },
    });
  },
};

export default inboxList;
