import type { ActionDefinition } from "@w6w/types";
import { csv, FreshdeskClient, unset } from "../lib/client.ts";

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
  resource: "ticket",
  title: "Reply to Ticket",
  description: "Send a public reply to the ticket's requester.",
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
      hint: "Must be a configured support email. Defaults to the ticket's group email.",
    },
    {
      key: "ccEmails",
      label: "CC emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "bccEmails",
      label: "BCC emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Reply ID" },
    { key: "body", type: "string", label: "Body" },
  ],

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request(`/tickets/${input.ticketId}/reply`, {
      method: "POST",
      body: {
        body: input.body,
        from_email: unset(input.fromEmail),
        cc_emails: csv(input.ccEmails),
        bcc_emails: csv(input.bccEmails),
      },
    });
  },
};

export default ticketAddReply;
