import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Block Ticket — Block a ticket so its submitter can no longer interact. Needs an API key with the TICKETFORMS_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  ticketId: string;
}

const ticketBlock: ActionDefinition<Input> = {
  key: "ticket-block",
  type: "perform",
  resource: "ticket",
  title: "Block Ticket",
  description:
    "Block a ticket so its submitter can no longer interact. Needs an API key with the TICKETFORMS_WRITE scope.",
  idempotent: true,
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
      "key": "items",
      "type": "array",
      "label": "Blocked targets, each { target, targetType, status }",
    },
    {
      "key": "failed",
      "type": "array",
      "label": "Targets that could not be blocked",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/ticket-form/${encodeId(input.ticketFormId)}/tickets/${encodeId(input.ticketId)}/block`,
      { method: "PUT" },
    );
  },
};

export default ticketBlock;
