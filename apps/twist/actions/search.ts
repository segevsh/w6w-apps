import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `GET /api/v3/search`
 *
 * Full-text search over threads, conversations and messages in a workspace. Page with the returned `next_cursor_mark`.
 */
interface Input {
  workspaceId: number;
  query: string;
  limit?: number;
  cursorMark?: string;
  type?: string;
  title?: string;
  toUserId?: number;
  toGroupId?: number;
  conversationIds?: string;
  channelIds?: string;
  fromUserId?: number;
  beforeTs?: number;
  afterTs?: number;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description:
    "Full-text search over threads, conversations and messages in a workspace. Page with the returned `next_cursor_mark`.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    { key: "query", label: "Query", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", hint: "Twist default 20, maximum 100." },
    {
      key: "cursorMark",
      label: "Cursor",
      type: "string",
      hint: "The `next_cursor_mark` of the previous page.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      hint: "`all` (default), `threads` or `messages`.",
      options: [{ value: "all", label: "all" }, { value: "threads", label: "threads" }, {
        value: "messages",
        label: "messages",
      }],
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Filter by thread or conversation title.",
    },
    {
      key: "toUserId",
      label: "To user ID",
      type: "number",
      hint: "Only objects that notified this user.",
    },
    {
      key: "toGroupId",
      label: "To group ID",
      type: "number",
      hint: "Only objects that notified this group.",
    },
    {
      key: "conversationIds",
      label: "Conversation IDs",
      type: "string",
      hint: "Comma-separated conversation ids.",
    },
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      hint: "Comma-separated channel ids.",
    },
    {
      key: "fromUserId",
      label: "From user ID",
      type: "number",
      hint: "Only objects created by this user.",
    },
    { key: "beforeTs", label: "Before (Unix time)", type: "number" },
    { key: "afterTs", label: "After (Unix time)", type: "number" },
  ],
  output: [
    {
      key: "next_cursor_mark",
      type: "string",
      label: "Cursor for the next page, when there is one",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/search",
      params: {
        "workspace_id": input.workspaceId,
        "query": input.query,
        "limit": input.limit,
        "cursor_mark": input.cursorMark,
        "type": input.type,
        "title": input.title,
        "to_user_id": input.toUserId,
        "to_group_id": input.toGroupId,
        "conversation_ids": idList(input.conversationIds),
        "channel_ids": idList(input.channelIds),
        "from_user_id": input.fromUserId,
        "before_ts": input.beforeTs,
        "after_ts": input.afterTs,
      },
    });
  },
};

export default search;
