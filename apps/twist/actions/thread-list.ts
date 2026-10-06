import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `GET /api/v3/threads/get`
 *
 * List the threads in a channel.
 */
interface Input {
  channelId: number;
  asIds?: boolean;
  filterBy?: string;
  limit?: number;
  newerThanTs?: number;
  olderThanTs?: number;
  beforeId?: number;
  afterId?: number;
  workspaceId?: number;
  isPinned?: boolean;
  isStarred?: boolean;
  orderBy?: string;
  excludeThreadIds?: string;
}

const threadList: ActionDefinition<Input> = {
  key: "thread-list",
  type: "read",
  resource: "thread",
  title: "List Threads",
  description: "List the threads in a channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
    {
      key: "asIds",
      label: "Ids only",
      type: "boolean",
      hint: "Return only ids instead of full objects.",
    },
    {
      key: "filterBy",
      label: "Filter",
      type: "select",
      hint: "`everyone` (default) or `attached_to_me`.",
      options: [{ value: "everyone", label: "everyone" }, {
        value: "attached_to_me",
        label: "attached_to_me",
      }],
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
    { key: "workspaceId", label: "Workspace ID", type: "number" },
    { key: "isPinned", label: "Pinned only", type: "boolean" },
    { key: "isStarred", label: "Starred only", type: "boolean" },
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
      path: "/threads/get",
      params: {
        "channel_id": input.channelId,
        "as_ids": input.asIds,
        "filter_by": input.filterBy,
        "limit": input.limit,
        "newer_than_ts": input.newerThanTs,
        "older_than_ts": input.olderThanTs,
        "before_id": input.beforeId,
        "after_id": input.afterId,
        "workspace_id": input.workspaceId,
        "is_pinned": input.isPinned,
        "is_starred": input.isStarred,
        "order_by": input.orderBy,
        "exclude_thread_ids": idList(input.excludeThreadIds),
      },
    });
  },
};

export default threadList;
