import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/inbox/unarchive`
 *
 * Unarchive one thread in the inbox.
 */
interface Input {
  threadId: number;
}

const inboxUnarchiveThread: ActionDefinition<Input> = {
  key: "inbox-unarchive-thread",
  type: "perform",
  resource: "inbox",
  title: "Unarchive Inbox Thread",
  description: "Unarchive one thread in the inbox.",
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
      path: "/inbox/unarchive",
      params: { "id": input.threadId },
    });
  },
};

export default inboxUnarchiveThread;
