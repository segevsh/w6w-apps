import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/remove`
 *
 * Delete a thread.
 */
interface Input {
  threadId: number;
}

const threadRemove: ActionDefinition<Input> = {
  key: "thread-remove",
  type: "perform",
  resource: "thread",
  title: "Remove Thread",
  description: "Delete a thread.",
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
      path: "/threads/remove",
      params: { "id": input.threadId },
    });
  },
};

export default threadRemove;
