import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/conversations/get`
 *
 * List the user's conversations in a workspace.
 */
interface Input {
  workspaceId: number;
  limit?: number;
  newerThanTs?: number;
  olderThanTs?: number;
  beforeId?: number;
  afterId?: number;
  orderBy?: string;
  archived?: boolean;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "List the user's conversations in a workspace.",
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
      hint: "Maximum items to return (Twist default 20, maximum 500).",
    },
    { key: "newerThanTs", label: "Newer than (Unix time)", type: "number" },
    { key: "olderThanTs", label: "Older than (Unix time)", type: "number" },
    {
      key: "beforeId",
      label: "Before ID",
      type: "number",
      hint: "Only items with a lower id than this.",
    },
    {
      key: "afterId",
      label: "After ID",
      type: "number",
      hint: "Only items with a higher id than this.",
    },
    {
      key: "orderBy",
      label: "Order",
      type: "select",
      hint: "`desc` (default) or `asc`.",
      options: [{ value: "desc", label: "desc" }, { value: "asc", label: "asc" }],
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Return only archived conversations.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/conversations/get",
      params: {
        "workspace_id": input.workspaceId,
        "limit": input.limit,
        "newer_than_ts": input.newerThanTs,
        "older_than_ts": input.olderThanTs,
        "before_id": input.beforeId,
        "after_id": input.afterId,
        "order_by": input.orderBy,
        "archived": input.archived,
      },
    });
  },
};

export default conversationList;
