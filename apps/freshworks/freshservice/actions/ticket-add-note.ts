import type { ActionDefinition } from "@w6w/types";
import { csv, FreshserviceClient } from "../lib/client.ts";

interface Input {
  ticketId: number;
  body: string;
  private?: boolean;
  incoming?: boolean;
  notifyEmails?: string;
}

const ticketAddNote: ActionDefinition<Input> = {
  key: "ticket-add-note",
  type: "perform",
  resource: "conversation",
  title: "Add Note to Ticket",
  description:
    "Add a note to a ticket. Notes are private by default — visible to agents but not the requester.",
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
      hint: "Freshservice defaults notes to private. Set false for a note the requester can see.",
    },
    {
      key: "incoming",
      label: "Incoming",
      type: "boolean",
      advanced: true,
      hint: "Mark the note as having come from outside the portal.",
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
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "body", type: "string", label: "Body" },
  ],

  execute(input, ctx) {
    // Freshservice envelopes both notes and replies as `conversation`.
    return new FreshserviceClient(ctx).resource(
      "conversation",
      `/tickets/${input.ticketId}/notes`,
      {
        method: "POST",
        body: {
          body: input.body,
          private: input.private ?? true,
          incoming: input.incoming,
          notify_emails: csv(input.notifyEmails),
        },
      },
    );
  },
};

export default ticketAddNote;
