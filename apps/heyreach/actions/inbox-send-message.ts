import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";

interface Input {
  linkedInAccountId: number;
  conversationId: string;
  message: string;
  subject?: string;
}

/**
 * `POST /api/public/inbox/SendMessage` — reply inside a LinkedIn conversation.
 *
 * ## Not idempotent, by nature
 *
 * Sending a message twice sends two messages, and there is no dedupe key in the
 * body: `idempotent: false`. A retried step is a second message to a human
 * being, which is the one failure mode a LinkedIn automation tool cannot undo.
 *
 * ## The conversation, not the lead, is the address
 *
 * The body takes `conversationId` (from `inbox-get-conversations`) plus the
 * `linkedInAccountId` that owns it — HeyReach will not guess which sender's
 * inbox a conversation belongs to. Both are required.
 *
 * ## `subject`
 *
 * The document's schema lists `subject`, and its prose explains only
 * `linkedInAccountId` ("The id of your LinkedIn sender"). A LinkedIn DM has no
 * subject line, so it is exposed as optional and sent only when set — if the
 * account's message type does require one, HeyReach answers 400 and says so.
 *
 * The documented response is `200 Successful response` with **no body**, so the
 * action returns the status. Confirm the send with `inbox-get-conversations`
 * rather than by parsing a response.
 */
const action: ActionDefinition<Input> = {
  key: "inbox-send-message",
  type: "perform",
  resource: "inbox",
  title: "Send Message",
  description: "Send a message into an existing LinkedIn conversation " +
    "(POST /api/public/inbox/SendMessage).",
  idempotent: false,
  params: [
    {
      key: "linkedInAccountId",
      label: "LinkedIn account",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The sender account that owns the conversation.",
    },
    {
      key: "conversationId",
      label: "Conversation",
      type: "string",
      required: true,
      hint: "The `id` from Get Conversations.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      hint: "The message body. Sending is not idempotent — a retry sends it twice.",
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Only sent when set. A plain LinkedIn message has no subject line.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const status = await new HeyReachClient(ctx).status("/inbox/SendMessage", {
      method: "POST",
      body: compact({
        linkedInAccountId: input.linkedInAccountId,
        conversationId: input.conversationId,
        message: input.message,
        subject: input.subject,
      }),
    });
    return { status };
  },
};

export default action;
