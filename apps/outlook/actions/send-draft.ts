import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * `POST /me/messages/{id}/send` — send an existing draft.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-send
 *
 * Graph documents this as taking no request body (and `Content-Length: 0`),
 * which is exactly what a body-less POST produces — the header is computed by
 * the runtime, and `Content-Length` is not settable from `fetch` anyway.
 *
 * Requires the `Mail.Send` scope. Answers `202 Accepted`, empty body.
 */
const sendDraft: ActionDefinition<Input> = {
  key: "send-draft",
  type: "perform",
  resource: "message",
  title: "Send Draft",
  description: "Send a draft message that already exists in the mailbox.",
  // The draft is consumed by a successful send, so a retry does not resend —
  // but it does not succeed either, and Graph publishes no dedupe key here.
  idempotent: false,
  params: [
    {
      key: "messageId",
      label: "Draft message ID",
      type: "string",
      required: true,
      hint: "The `id` returned by Create Draft.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.status(`/me/messages/${encodeURIComponent(input.messageId)}/send`, {
      method: "POST",
    });
  },
};

export default sendDraft;
