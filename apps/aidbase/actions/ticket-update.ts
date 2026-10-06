import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Update Ticket — Change a ticket's status and/or priority. At least one is required, and Aidbase rejects any other field. Needs the TICKETS_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  ticketId: string;
  status?: string;
  priority?: string;
}

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description:
    "Change a ticket's status and/or priority. At least one is required, and Aidbase rejects any other field. Needs the TICKETS_WRITE scope.",
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
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "open",
          "label": "open",
        },
        {
          "value": "assigned",
          "label": "assigned",
        },
        {
          "value": "need_more_info",
          "label": "need_more_info",
        },
        {
          "value": "resolved",
          "label": "resolved",
        },
        {
          "value": "closed",
          "label": "closed",
        },
      ],
    },
    {
      "key": "priority",
      "label": "Priority",
      "type": "string",
      "hint": "For example low, medium or high.",
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
    if (input.status === undefined && input.priority === undefined) {
      return Promise.reject(new Error("Aidbase: give at least one of status or priority"));
    }
    return new AidbaseClient(ctx).done(
      `/ticket-form/${encodeId(input.ticketFormId)}/tickets/${encodeId(input.ticketId)}`,
      { method: "PUT", body: compact({ status: input.status, priority: input.priority }) },
    );
  },
};

export default ticketUpdate;
