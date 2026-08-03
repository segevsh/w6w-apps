import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, itemBody, preferHeaders, toRecipients } from "../lib/client.ts";
import { timeZoneParam } from "../lib/params.ts";

interface Input {
  messageId: string;
  replyAll?: boolean;
  comment?: string;
  bodyContent?: string;
  bodyType?: string;
  to?: string[];
  timeZone?: string;
}

/**
 * `POST /me/messages/{id}/reply` and `.../replyAll` — reply and send in one call.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-reply
 * https://learn.microsoft.com/en-us/graph/api/message-replyall
 *
 * Two documented rules are enforced here rather than left to a 400:
 *
 *  - **`comment` XOR `message.body`.** Both pages state that specifying a
 *    comment *and* the message body returns `400 Bad Request`. Catching that
 *    locally turns a remote error into a legible one.
 *  - **`replyTo` wins over `from`.** Graph honours the original message's
 *    `replyTo` per RFC 2822; nothing here needs to reproduce that.
 *
 * Requires the `Mail.Send` scope. Answers `202 Accepted`, empty body.
 */
const replyMessage: ActionDefinition<Input> = {
  key: "reply-message",
  type: "perform",
  resource: "message",
  title: "Reply to Message",
  description: "Reply to the sender, or to everyone, and send immediately.",
  idempotent: false,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "replyAll",
      label: "Reply to all",
      type: "boolean",
      default: false,
      hint: "Reply to every recipient of the original message, not just the sender.",
    },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      hint:
        "Prepended above the quoted original. Mutually exclusive with Body — supplying both is rejected by Graph.",
    },
    {
      key: "bodyContent",
      label: "Body",
      type: "text",
      advanced: true,
      hint: "Replaces the reply body outright. Mutually exclusive with Comment.",
    },
    {
      key: "bodyType",
      label: "Body format",
      type: "select",
      default: "HTML",
      advanced: true,
      options: [
        { value: "HTML", label: "HTML" },
        { value: "Text", label: "Plain text" },
      ],
    },
    {
      key: "to",
      label: "Additional recipients",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "Adds recipients to the reply.",
    },
    timeZoneParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    if (input.comment && input.bodyContent) {
      throw new Error(
        "reply-message: supply either `comment` or `bodyContent`, not both — Microsoft Graph rejects the combination with 400 Bad Request.",
      );
    }

    const message = compact({
      body: itemBody(input.bodyContent, input.bodyType),
      toRecipients: toRecipients(input.to),
    });

    const body = compact({
      comment: input.comment,
      message: Object.keys(message).length ? message : undefined,
    });

    const client = new GraphClient(ctx);
    const verb = input.replyAll ? "replyAll" : "reply";
    return client.status(`/me/messages/${encodeURIComponent(input.messageId)}/${verb}`, {
      method: "POST",
      body,
      headers: preferHeaders({ timeZone: input.timeZone }),
    });
  },
};

export default replyMessage;
