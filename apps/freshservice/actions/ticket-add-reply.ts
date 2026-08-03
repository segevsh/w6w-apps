import type { ActionDefinition } from "@w6w/types";
import { csv, FreshserviceClient, unset } from "../lib/client.ts";

interface Input {
  ticketId: number;
  body: string;
  fromEmail?: string;
  ccEmails?: string;
  bccEmails?: string;
}

const ticketAddReply: ActionDefinition<Input> = {
  key: "ticket-add-reply",
  type: "perform",
  resource: "conversation",
  title: "Reply to Ticket",
  description: "Send a public reply to the requester. Unlike a note, this leaves the portal.",
  idempotent: false,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    {
      key: "body",
      label: "Reply",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "HTML content of the reply.",
    },
    {
      key: "fromEmail",
      label: "From email",
      type: "string",
      advanced: true,
      hint: "Defaults to the portal's global support address.",
    },
    { key: "ccEmails", label: "CC emails", type: "string", advanced: true, row: "copies" },
    { key: "bccEmails", label: "BCC emails", type: "string", advanced: true, row: "copies" },
  ],
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "body", type: "string", label: "Body" },
  ],

  execute(input, ctx) {
    return new FreshserviceClient(ctx).resource(
      "conversation",
      `/tickets/${input.ticketId}/reply`,
      {
        method: "POST",
        body: {
          body: input.body,
          from_email: unset(input.fromEmail),
          cc_emails: csv(input.ccEmails),
          bcc_emails: csv(input.bccEmails),
        },
      },
    );
  },
};

export default ticketAddReply;
