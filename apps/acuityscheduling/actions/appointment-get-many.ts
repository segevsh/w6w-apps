import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  max?: number;
  minDate?: string;
  maxDate?: string;
  calendarID?: number;
  appointmentTypeID?: number;
  canceled?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  excludeForms?: boolean;
  direction?: "ASC" | "DESC";
}

/**
 * GET /appointments — list appointments, optionally filtered by date range,
 * calendar, appointment type or client. `canceled: true` returns canceled
 * appointments instead of active ones (the API defaults to active-only).
 */
const appointmentGetMany: ActionDefinition<Input, unknown[]> = {
  key: "appointment-get-many",
  type: "read",
  resource: "appointment",
  title: "List Appointments",
  description:
    "List appointments, optionally filtered by date range, calendar, type or client (GET /appointments).",
  params: [
    {
      key: "max",
      label: "Max results",
      type: "number",
      hint: "Maximum number of results. Default 100.",
      validation: { min: 1, integer: true },
    },
    {
      key: "minDate",
      label: "Min date",
      type: "date",
      hint: "Only appointments on or after this date.",
    },
    {
      key: "maxDate",
      label: "Max date",
      type: "date",
      hint: "Only appointments on or before this date.",
    },
    {
      key: "calendarID",
      label: "Calendar ID",
      type: "number",
      hint: "Show only appointments on this calendar.",
    },
    {
      key: "appointmentTypeID",
      label: "Appointment Type ID",
      type: "number",
      hint: "Show only appointments of this type.",
    },
    {
      key: "canceled",
      label: "Canceled only",
      type: "boolean",
      default: false,
      hint: "Return canceled appointments instead of active ones.",
    },
    { key: "firstName", label: "Client first name", type: "string", advanced: true },
    { key: "lastName", label: "Client last name", type: "string", advanced: true },
    { key: "email", label: "Client email", type: "string", advanced: true },
    {
      key: "phone",
      label: "Client phone",
      type: "string",
      advanced: true,
      hint: "A leading + is URL-encoded automatically.",
    },
    {
      key: "excludeForms",
      label: "Exclude intake forms",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Skip intake form data in the response.",
    },
    {
      key: "direction",
      label: "Sort direction",
      type: "select",
      advanced: true,
      default: "DESC",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
  ],
  output: [{ key: "", type: "array", label: "Appointments" }],

  execute(input, ctx) {
    return new AcuityClient(ctx).request<unknown[]>("/appointments", {
      query: {
        max: input.max,
        minDate: input.minDate,
        maxDate: input.maxDate,
        calendarID: input.calendarID,
        appointmentTypeID: input.appointmentTypeID,
        canceled: input.canceled,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        excludeForms: input.excludeForms,
        direction: input.direction,
      },
    });
  },
};

export default appointmentGetMany;
