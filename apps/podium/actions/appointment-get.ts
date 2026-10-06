import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const appointmentGet: ActionDefinition<Input> = {
  key: "appointment-get",
  type: "read",
  resource: "appointment",
  title: "Get Appointment",
  description: "Get one appointment by uid. Requires scope `read_appointments`.",
  params: [{
    key: "uid",
    label: "Appointment UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "aiGenerated",
    type: "boolean",
    label: "Whether Podium's AI scheduled the appointment",
  }, {
    key: "appointmentType",
    type: "string",
    label: "The appointment type as CRM Core records it, e.g. `service`",
  }, {
    key: "assignedUser",
    type: "object",
    label: "Assigned user object",
  }, {
    key: "confirmation",
    type: "object",
    label: "The customer's confirmation response, when one has been recorded",
  }, {
    key: "contact",
    type: "object",
    label: "The CRM contact the appointment is for",
  }, {
    key: "contactName",
    type: "string",
    label: "Name of the contact",
  }, {
    key: "contactPhoneNumber",
    type: "string",
    label: "Phone number of the contact",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the appointment was created",
  }, {
    key: "customFields",
    type: "array",
    label: "Custom fields on the appointment as name/value pairs, sorted by `name`",
  }, {
    key: "datetime",
    type: "string",
    label: "Date and time of the appointment",
  }, {
    key: "description",
    type: "string",
    label: "Description of the appointment",
  }, {
    key: "durationMin",
    type: "number",
    label: "How many miuntes long the appointment is",
  }, {
    key: "endAt",
    type: "string",
    label: "When the appointment ends",
  }, {
    key: "externalId",
    type: "string",
    label: "The integration's own identifier for the appointment",
  }, {
    key: "externalStatus",
    type: "string",
    label: "The integration's own status, e.g. `Scheduled`",
  }, {
    key: "integrationUid",
    type: "string",
    label: "Podium unique identifier for integration that synced the appointment",
  }, {
    key: "location",
    type: "object",
    label: "Location object",
  }, {
    key: "note",
    type: "string",
    label: "Note that is attached to the appointment",
  }, {
    key: "startAt",
    type: "string",
    label: "When the appointment starts",
  }, {
    key: "status",
    type: "string",
    label: "Status of the appointment. On the read endpoints this is only the cust",
  }, {
    key: "title",
    type: "string",
    label: "Title of the appointment",
  }, {
    key: "type",
    type: "string",
    label: "Type of appointment",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for appointment",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the appointment was updated",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/appointments/${encodeId(input.uid)}`);
  },
};

export default appointmentGet;
