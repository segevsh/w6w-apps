import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, ref, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/appointments/{id}` — Update a appointment.
 */
interface Input {
  id: number;
  description?: string;
  date?: string;
  endDate?: string;
  notes?: string;
  clientId?: number;
  userIds?: string;
  contactIds?: string;
  activityTypeId?: number;
  fields?: unknown;
}

const appointmentUpdate: ActionDefinition<Input> = {
  key: "appointment-update",
  type: "perform",
  resource: "appointment",
  title: "Update Appointment",
  description: "Update a appointment.",
  idempotent: true,
  params: [
    idParam("id", "Appointment ID"),
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "date",
      "label": "Start",
      "type": "string",
      "hint": "ISO 8601 date-time.",
    },
    {
      "key": "endDate",
      "label": "End",
      "type": "string",
      "hint": "ISO 8601 date-time.",
    },
    {
      "key": "notes",
      "label": "Notes",
      "type": "text",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
      "hint": "Sent as a plain id, as in the vendor example.",
    },
    {
      "key": "userIds",
      "label": "User IDs",
      "type": "string",
      "hint": "Comma-separated Upsales user IDs, e.g. `1,2`.",
    },
    {
      "key": "contactIds",
      "label": "Contact IDs",
      "type": "string",
      "hint": "Comma-separated contact IDs, e.g. `3,4`.",
    },
    {
      "key": "activityTypeId",
      "label": "Appointment type ID",
      "type": "number",
      "hint": "From List Appointment Types.",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated appointment" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      description: input.description,
      date: input.date,
      endDate: input.endDate,
      notes: input.notes,
      client: input.clientId,
      users: refs(input.userIds),
      contacts: refs(input.contactIds),
      activityType: ref(input.activityTypeId),
      isAppointment: true,
    });
    if (
      Object.keys(body).filter((k) => !(["isAppointment"] as string[]).includes(k)).length === 0
    ) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/appointments/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default appointmentUpdate;
