import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/inbox/archive`
 *
 * Archive one thread in the inbox.
 */
interface Input {
  threadId: number;
}

const inboxArchiveThread: ActionDefinition<Input> = {
  key: "inbox-archive-thread",
  type: "perform",
  resource: "inbox",
  title: "Archive Inbox Thread",
  description: "Archive one thread in the inbox.",
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
    return twist(ctx, { method: "POST", path: "/inbox/archive", params: { "id": input.threadId } });
  },
};

export default inboxArchiveThread;
