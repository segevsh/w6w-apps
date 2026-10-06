import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/unstar`
 *
 * Unstar a thread.
 */
interface Input {
  threadId: number;
}

const threadUnstar: ActionDefinition<Input> = {
  key: "thread-unstar",
  type: "perform",
  resource: "thread",
  title: "Unstar Thread",
  description: "Unstar a thread.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
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
      method: "POST",
      path: "/threads/unstar",
      params: { "id": input.threadId },
    });
  },
};

export default threadUnstar;
