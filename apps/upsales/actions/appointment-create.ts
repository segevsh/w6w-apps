import type { ActionDefinition } from "@w6w/types";
import { buildBody, ref, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/appointments` — Create a appointment.
 */
interface Input {
  description: string;
  date: string;
  endDate: string;
  notes?: string;
  clientId?: number;
  userIds?: string;
  contactIds?: string;
  activityTypeId?: number;
  fields?: unknown;
}

const appointmentCreate: ActionDefinition<Input> = {
  key: "appointment-create",
  type: "perform",
  resource: "appointment",
  title: "Create Appointment",
  description: "Create a appointment.",
  idempotent: false,
  params: [
    {
      "key": "description",
      "label": "Description",
      "type": "string",
      "required": true,
    },
    {
      "key": "date",
      "label": "Start",
      "type": "string",
      "required": true,
      "hint": "ISO 8601 date-time.",
    },
    {
      "key": "endDate",
      "label": "End",
      "type": "string",
      "required": true,
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
  output: [{ key: "data", type: "object", label: "The created appointment" }],

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
    const data = await new UpsalesClient(ctx).data("POST", "/appointments", { body });
    return { data };
  },
};

export default appointmentCreate;
