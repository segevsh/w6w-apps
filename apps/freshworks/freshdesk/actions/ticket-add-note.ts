import type { ActionDefinition } from "@w6w/types";
import { csv, FreshdeskClient } from "../lib/client.ts";

interface Input {
  ticketId: number;
  body: string;
  private?: boolean;
  notifyEmails?: string;
}

const ticketAddNote: ActionDefinition<Input> = {
  key: "ticket-add-note",
  type: "perform",
  resource: "ticket",
  title: "Add Note to Ticket",
  description: "Add an internal note, visible to agents but not the requester.",
  idempotent: false,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    {
      key: "body",
      label: "Note",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "HTML content of the note.",
    },
    {
      key: "private",
      label: "Private",
      type: "boolean",
      default: true,
      hint: "Private notes are visible only to agents.",
    },
    {
      key: "notifyEmails",
      label: "Notify emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Agent addresses to notify of this note.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "body", type: "string", label: "Body" },
  ],

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request(`/tickets/${input.ticketId}/notes`, {
      method: "POST",
      body: {
        body: input.body,
        private: input.private ?? true,
        notify_emails: csv(input.notifyEmails),
      },
    });
  },
};

export default ticketAddNote;
