import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/threads/getone`
 *
 * Get a thread by id.
 */
interface Input {
  threadId: number;
}

const threadGet: ActionDefinition<Input> = {
  key: "thread-get",
  type: "read",
  resource: "thread",
  title: "Get Thread",
  description: "Get a thread by id.",
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "channel_id", type: "number", label: "Channel ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, { method: "GET", path: "/threads/getone", params: { "id": input.threadId } });
  },
};

export default threadGet;
