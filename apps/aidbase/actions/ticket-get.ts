import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Ticket — Fetch one ticket with its conversation.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  ticketId: string;
}

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch one ticket with its conversation.",
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
      "key": "status",
      "type": "string",
      "label": "Status",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/ticket-form/${encodeId(input.ticketFormId)}/tickets/${encodeId(input.ticketId)}`,
    );
  },
};

export default ticketGet;
