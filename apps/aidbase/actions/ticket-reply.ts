import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Reply to Ticket — Send a reply to a ticket on behalf of the form owner. Needs the TICKETS_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  ticketId: string;
  message: string;
  personaId?: string;
}

const ticketReply: ActionDefinition<Input> = {
  key: "ticket-reply",
  type: "perform",
  resource: "ticket",
  title: "Reply to Ticket",
  description:
    "Send a reply to a ticket on behalf of the form owner. Needs the TICKETS_WRITE scope.",
  idempotent: false,
  params: [
    {
      "key": "ticketFormId",
      "label": "Ticket Form ID",
      "type": "string",
      "required": true,
      "hint": "The form's public ID (`public_id` from List Ticket Forms).",
    },
    {
      "key": "ticketId",
      "label": "Ticket ID",
      "type": "string",
      "required": true,
      "hint": "From List Tickets.",
    },
    {
      "key": "message",
      "label": "Message",
      "type": "text",
      "required": true,
    },
    {
      "key": "personaId",
      "label": "Persona ID",
      "type": "string",
      "hint":
        "Optional persona to send as; otherwise the account username and picture are used. Aidbase answers 400 for an unknown persona.",
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
      `/ticket-form/${encodeId(input.ticketFormId)}/tickets/${encodeId(input.ticketId)}/reply`,
      { method: "POST", body: compact({ message: input.message, persona_id: input.personaId }) },
    );
  },
};

export default ticketReply;
