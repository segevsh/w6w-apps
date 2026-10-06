import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/search/thread`
 *
 * Search a thread; returns matching comment ids (latest 10,000 at most).
 */
interface Input {
  threadId: number;
  query: string;
  toUserId?: number;
  toGroupId?: number;
  fromUserId?: number;
  beforeTs?: number;
  afterTs?: number;
}

const searchThread: ActionDefinition<Input> = {
  key: "search-thread",
  type: "search",
  resource: "search",
  title: "Search Within Thread",
  description: "Search a thread; returns matching comment ids (latest 10,000 at most).",
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    { key: "query", label: "Query", type: "string", required: true },
    { key: "toUserId", label: "To user ID", type: "number" },
    { key: "toGroupId", label: "To group ID", type: "number" },
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
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/search/thread",
      params: {
        "thread_id": input.threadId,
        "query": input.query,
        "to_user_id": input.toUserId,
        "to_group_id": input.toGroupId,
        "from_user_id": input.fromUserId,
        "before_ts": input.beforeTs,
        "after_ts": input.afterTs,
      },
    });
  },
};

export default searchThread;
