import type { ActionDefinition } from "@w6w/types";
import { buildBody, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/tickets` — Create a support ticket.
 *
 * The vendor added the tickets folder on 2026-09-02 with request examples only; no response
 * example is published, so the returned record is passed through untouched.
 */
interface Input {
  title: string;
  statusId?: number;
  typeId?: number;
  clientId?: number;
  contactId?: number;
  userId?: number;
  priority?: number;
  fields?: unknown;
}

const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Create a support ticket.",
  idempotent: false,
  params: [
    {
      "key": "title",
      "label": "Title",
      "type": "string",
      "required": true,
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
  output: [{ key: "data", type: "object", label: "The created ticket" }],

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
    const data = await new UpsalesClient(ctx).data("POST", "/tickets", { body });
    return { data };
  },
};

export default ticketCreate;
