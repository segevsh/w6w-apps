import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  id: number;
  datetime: string;
  calendarID?: number;
  timezone?: string;
}

/**
 * PUT /appointments/{id}/reschedule — move an appointment to a new time.
 * `calendarID` is optional: omit to keep the current calendar, or the API
 * treats a `null` as "pick automatically" — this action only sends the field
 * when a value is given, so omitting it keeps the current calendar as
 * documented.
 */
const appointmentReschedule: ActionDefinition<Input> = {
  key: "appointment-reschedule",
  type: "perform",
  resource: "appointment",
  title: "Reschedule Appointment",
  description: "Move an appointment to a new date/time (PUT /appointments/{id}/reschedule).",
  idempotent: true,
  params: [
    { key: "id", label: "Appointment ID", type: "number", required: true },
    {
      key: "datetime",
      label: "New date & time",
      type: "datetime",
      required: true,
      hint: "Parsed in the business timezone, e.g. 2026-08-20T10:00:00-0400.",
    },
    {
      key: "calendarID",
      label: "Calendar ID",
      type: "number",
      advanced: true,
      hint: "Omit to keep the current calendar.",
    },
    { key: "timezone", label: "Client timezone", type: "string", advanced: true },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { datetime: input.datetime };
    if (input.calendarID !== undefined) body.calendarID = input.calendarID;
    if (input.timezone !== undefined) body.timezone = input.timezone;
    return new AcuityClient(ctx).request(
      `/appointments/${encodeURIComponent(input.id)}/reschedule`,
      { method: "PUT", body },
    );
  },
};

export default appointmentReschedule;
