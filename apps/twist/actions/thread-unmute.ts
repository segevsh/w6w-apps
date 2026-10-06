import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/unmute`
 *
 * Unmute a thread.
 */
interface Input {
  threadId: number;
}

const threadUnmute: ActionDefinition<Input> = {
  key: "thread-unmute",
  type: "perform",
  resource: "thread",
  title: "Unmute Thread",
  description: "Unmute a thread.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "channel_id", type: "number", label: "Channel ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/threads/unmute",
      params: { "id": input.threadId },
    });
  },
};

export default threadUnmute;
