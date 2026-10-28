import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, toRecipients } from "../lib/client.ts";

interface Input {
  messageId: string;
  to: string[];
  comment?: string;
}

/**
 * `POST /me/messages/{id}/forward` — forward and send in one call.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-forward
 *
 * Graph documents `toRecipients` as required in practice: "Specifying both or
 * specifying neither will return an HTTP 400 Bad Request error" (referring to
 * the top-level parameter versus the one nested under `message`). This action
 * only ever sends the top-level form, so the ambiguity cannot arise, and the
 * param is marked required so the empty case is caught in the form.
 *
 * Requires the `Mail.Send` scope. Answers `202 Accepted`, empty body.
 */
const forwardMessage: ActionDefinition<Input> = {
  key: "forward-message",
  type: "perform",
  resource: "message",
  title: "Forward Message",
  description: "Forward a message to one or more recipients.",
  idempotent: false,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "to", label: "Forward to", type: "string", repeat: true, required: true },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      hint: "Prepended above the forwarded original.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    const recipients = toRecipients(input.to);
    if (!recipients) {
      throw new Error("forward-message: `to` must contain at least one address.");
    }

    const client = new GraphClient(ctx);
    return client.status(`/me/messages/${encodeURIComponent(input.messageId)}/forward`, {
      method: "POST",
      body: compact({ comment: input.comment, toRecipients: recipients }),
    });
  },
};

export default forwardMessage;
