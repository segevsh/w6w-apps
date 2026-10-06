import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireText, segment } from "../lib/client.ts";

/**
 * Read a message thread. Wraps `GET /v2/messaging/{threadGuid}` ("Get thread details"):
 * the path takes the thread's uuid (a booking's or enquiry's `thread_uid`). The response
 * is an array of `{thread_uid, guest_name, guest_email, last_message_date, is_read,
 * messages[], is_closed, ...}`.
 */
const action: ActionDefinition = {
  key: "get-message-thread",
  type: "read",
  resource: "message",
  title: "Get a message thread",
  description: "Read a guest message thread with all its messages.",
  params: [
    {
      key: "threadId",
      label: "Thread ID",
      type: "string",
      required: true,
      hint: "The `thread_uid` UUID found on a booking or enquiry.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Threads" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireText(p.threadId, "threadId");
    return await new LodgifyClient(ctx).list(`/v2/messaging/${segment(id)}`);
  },
};

export default action;
