import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Email — Fetch one email with its conversation.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  emailId: string;
}

const emailGet: ActionDefinition<Input> = {
  key: "email-get",
  type: "read",
  resource: "email",
  title: "Get Email",
  description: "Fetch one email with its conversation.",
  params: [
    {
      "key": "emailInboxId",
      "label": "Email Inbox ID",
      "type": "string",
      "required": true,
      "hint": "The inbox ID.",
    },
    {
      "key": "emailId",
      "label": "Email ID",
      "type": "string",
      "required": true,
      "hint": "From List Emails.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "ID",
    },
    {
      "key": "created_at",
      "type": "string",
      "label": "Created (ISO 8601)",
    },
    {
      "key": "updated_at",
      "type": "string",
      "label": "Updated (ISO 8601)",
    },
    {
      "key": "conversation",
      "type": "array",
      "label": "Messages, each { role: user|assistant, message }",
    },
    {
      "key": "subject",
      "type": "string",
      "label": "Subject",
    },
    {
      "key": "from_email",
      "type": "string",
      "label": "Sender",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Status",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/email-inbox/${encodeId(input.emailInboxId)}/emails/${encodeId(input.emailId)}`,
    );
  },
};

export default emailGet;
