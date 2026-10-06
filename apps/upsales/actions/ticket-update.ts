import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/tickets/{id}` — Update a support ticket.
 *
 * The vendor added the tickets folder on 2026-09-02 with request examples only; no response
 * example is published, so the returned record is passed through untouched.
 */
interface Input {
  id: number;
  title?: string;
  statusId?: number;
  typeId?: number;
  clientId?: number;
  contactId?: number;
  userId?: number;
  priority?: number;
  fields?: unknown;
}

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: "Update a support ticket.",
  idempotent: true,
  params: [
    idParam("id", "Ticket ID"),
    {
      "key": "title",
      "label": "Title",
      "type": "string",
    },
    {
      "key": "statusId",
      "label": "Status ID",
      "type": "number",
    },
    {
      "key": "typeId",
      "label": "Type ID",
      "type": "number",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
    },
    {
      "key": "contactId",
      "label": "Contact ID",
      "type": "number",
    },
    {
      "key": "userId",
      "label": "Assigned user ID",
      "type": "number",
    },
    {
      "key": "priority",
      "label": "Priority",
      "type": "number",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated ticket" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      title: input.title,
      status: ref(input.statusId),
      type: ref(input.typeId),
      client: ref(input.clientId),
      contact: ref(input.contactId),
      user: ref(input.userId),
      priority: input.priority,
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/tickets/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default ticketUpdate;
