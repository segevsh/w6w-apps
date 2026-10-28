import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, requireString } from "../lib/client.ts";

interface Input {
  messageId: string;
  fields?: string;
}

/**
 * Read one message — `GET /{message-id}?fields=…`. Default fields are `id` and
 * `created_time`; the documented set for content is `from`, `to`, `message` and
 * `reply_to` (present only on a reply; `is_self_reply` flags a reply to the sender's own
 * message). Only the 20 most recent messages of a conversation can be read.
 */
const getMessage: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get a message's sender, recipient, text and reply context.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "id,created_time,from,to,message,reply_to",
      hint: "Comma-separated Graph fields.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "created_time", type: "string", label: "Created" },
    { key: "from", type: "object", label: "Sender" },
    { key: "to", type: "object", label: "Recipients" },
    { key: "message", type: "string", label: "Text" },
    { key: "reply_to", type: "object", label: "Reply context" },
  ],

  execute(input, ctx) {
    const id = requireString("messageId", input.messageId);
    return new MessengerClient(ctx).request<Record<string, unknown>>(
      `/${encodeURIComponent(id)}`,
      { query: { fields: input.fields || "id,created_time,from,to,message,reply_to" } },
    );
  },
};

export default getMessage;
