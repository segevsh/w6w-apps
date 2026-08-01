import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  datetime: string;
  appointmentTypeID: number;
  firstName: string;
  lastName: string;
  email: string;
  calendarID?: number;
  phone?: string;
  timezone?: string;
  certificate?: string;
  notes?: string;
  smsOptIn?: boolean;
  fields?: unknown;
}

/**
 * POST /appointments — book a new appointment. `datetime` is parsed by
 * Acuity's `strtotime` in the business or calendar timezone; `calendarID` is
 * optional and Acuity auto-assigns an available calendar when omitted.
 */
const appointmentCreate: ActionDefinition<Input> = {
  key: "appointment-create",
  type: "perform",
  resource: "appointment",
  title: "Create Appointment",
  description: "Book a new appointment (POST /appointments).",
  idempotent: false,
  params: [
    {
      key: "datetime",
      label: "Date & time",
      type: "datetime",
      required: true,
      hint: "Parsed in the business or calendar timezone, e.g. 2026-08-15T14:00:00-0400.",
    },
    { key: "appointmentTypeID", label: "Appointment Type ID", type: "number", required: true },
    { key: "firstName", label: "Client first name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Client last name", type: "string", required: true, row: "name" },
    {
      key: "email",
      label: "Client email",
      type: "string",
      required: true,
      hint:
        "Optional when booking as an admin credential, but the field itself is always required by the API.",
    },
    {
      key: "calendarID",
      label: "Calendar ID",
      type: "number",
      hint: "Omit to let Acuity pick an available calendar automatically.",
    },
    { key: "phone", label: "Client phone", type: "string", advanced: true },
    {
      key: "timezone",
      label: "Client timezone",
      type: "string",
      advanced: true,
      hint: "IANA timezone, e.g. America/New_York.",
    },
    {
      key: "certificate",
      label: "Package/coupon certificate",
      type: "string",
      advanced: true,
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
      advanced: true,
      hint: "Settable when booking as an admin.",
    },
    {
      key: "smsOptIn",
      label: "SMS opt-in",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Whether the client explicitly gave permission to receive SMS messages.",
    },
    {
      key: "fields",
      label: "Intake form fields",
      type: "json",
      advanced: true,
      hint: 'Array of { "id": <fieldId>, "value": <value> } objects.',
    },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      datetime: input.datetime,
      appointmentTypeID: input.appointmentTypeID,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      calendarID: input.calendarID,
      phone: input.phone,
      timezone: input.timezone,
      certificate: input.certificate,
      notes: input.notes,
      smsOptIn: input.smsOptIn,
      fields: input.fields,
    };
    return new AcuityClient(ctx).request("/appointments", { method: "POST", body });
  },
};

export default appointmentCreate;
