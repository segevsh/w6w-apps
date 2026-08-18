import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";

/**
 * `GET /messages/{message_id}` — verified against Front's own OpenAPI document
 * (`get-message`).
 *
 * One message in full, including the `recipients` array and any
 * `attachments` metadata, which the list view abbreviates. The usual reason to
 * call it is that a webhook or an event named a message id and the workflow
 * needs the body behind it.
 *
 * `body` is HTML and `text` is the plain-text twin — for anything fed to a
 * model, `text` avoids stripping tags and the quoted history that email clients
 * append.
 */
const action: ActionDefinition = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get message",
  description: "One message in full — body, author, recipients and attachment metadata.",
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "msg_55c8c149",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "body", type: "string", label: "Body (HTML)" },
    { key: "text", type: "string", label: "Body (plain text)" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "is_inbound", type: "boolean", label: "From the customer" },
    { key: "author", type: "object", label: "Author" },
    { key: "recipients", type: "array", label: "Recipients" },
    { key: "attachments", type: "array", label: "Attachments" },
  ],

  async execute(input, ctx) {
    const { messageId } = input as { messageId: string };
    if (!messageId) throw new Error("`messageId` is required");
    return await new FrontClient(ctx).request(`/messages/${encodeURIComponent(messageId)}`);
  },
};

export default action;
