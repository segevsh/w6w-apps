import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  locationUid: string;
  contactName: string;
  contactPhoneNumber: string;
  datetime: string;
  durationMin?: number;
  assignedUserUid?: string;
  note?: string;
  status?: string;
  type?: string;
}

const appointmentCreate: ActionDefinition<Input> = {
  key: "appointment-create",
  type: "perform",
  resource: "appointment",
  title: "Create Appointment",
  description:
    "Create an appointment for a contact at a location. Requires scope `write_appointments`.",
  idempotent: false,
  params: [{
    key: "locationUid",
    label: "Location UID",
    type: "string",
    required: true,
  }, {
    key: "contactName",
    label: "Contact name",
    type: "string",
    required: true,
  }, {
    key: "contactPhoneNumber",
    label: "Contact phone number",
    type: "string",
    required: true,
    hint: "E.164.",
  }, {
    key: "datetime",
    label: "Date and time",
    type: "string",
    required: true,
    hint: "ISO 8601 timestamp.",
  }, {
    key: "durationMin",
    label: "Duration (minutes)",
    type: "number",
    validation: {
      integer: true,
      min: 1,
    },
  }, {
    key: "assignedUserUid",
    label: "Assigned user UID",
    type: "string",
  }, {
    key: "note",
    label: "Note",
    type: "text",
  }, {
    key: "status",
    label: "Status",
    type: "select",
    options: [{
      value: "cancelled",
      label: "cancelled",
    }, {
      value: "completed",
      label: "completed",
    }, {
      value: "confirmed",
      label: "confirmed",
    }, {
      value: "no_show",
      label: "no_show",
    }, {
      value: "unconfirmed",
      label: "unconfirmed",
    }],
  }, {
    key: "type",
    label: "Type",
    type: "select",
    options: [{
      value: "in_person",
      label: "in_person",
    }, {
      value: "virtual",
      label: "virtual",
    }],
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
    return new PodiumClient(ctx).one("/appointments", {
      method: "POST",
      body: compact({
        locationUid: input.locationUid,
        contactName: input.contactName,
        contactPhoneNumber: input.contactPhoneNumber,
        datetime: input.datetime,
        durationMin: input.durationMin,
        assignedUserUid: input.assignedUserUid,
        note: input.note,
        status: input.status,
        type: input.type,
      }),
    });
  },
};

export default appointmentCreate;
