import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Reply to Email — Send a reply to an email on behalf of the inbox owner. Needs the EMAILS_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  emailId: string;
  message: string;
}

const emailReply: ActionDefinition<Input> = {
  key: "email-reply",
  type: "perform",
  resource: "email",
  title: "Reply to Email",
  description:
    "Send a reply to an email on behalf of the inbox owner. Needs the EMAILS_WRITE scope.",
  idempotent: false,
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
    {
      "key": "message",
      "label": "Message",
      "type": "text",
      "required": true,
    },
  ],
  output: [
    {
      "key": "ok",
      "type": "boolean",
      "label": "True when Aidbase answered success",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).done(
      `/email-inbox/${encodeId(input.emailInboxId)}/emails/${encodeId(input.emailId)}/reply`,
      { method: "POST", body: compact({ message: input.message }) },
    );
  },
};

export default emailReply;
