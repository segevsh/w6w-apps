import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  date: string;
  appointmentTypeID: number;
  calendarID?: number;
  addonIDs?: number[];
  timezone?: string;
  ignoreAppointmentIDs?: number[];
}

/**
 * GET /availability/times — bookable time slots for an appointment type on a
 * given date. Checks every calendar by default; scope to one with
 * `calendarID`.
 */
const availabilityTimeGetMany: ActionDefinition<Input, unknown[]> = {
  key: "availability-time-get-many",
  type: "read",
  resource: "availability",
  title: "Check Availability",
  description:
    "List bookable time slots for an appointment type on a given date (GET /availability/times).",
  params: [
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      hint: "Parsed by strtotime, e.g. 2026-08-15.",
    },
    { key: "appointmentTypeID", label: "Appointment Type ID", type: "number", required: true },
    {
      key: "calendarID",
      label: "Calendar ID",
      type: "number",
      hint: "Omit to check every calendar.",
    },
    {
      key: "addonIDs",
      label: "Addon IDs",
      type: "array",
      advanced: true,
      item: { type: "number" },
      hint: "Addons to include when calculating availability.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      advanced: true,
      hint: "IANA timezone for the returned times, e.g. America/New_York.",
    },
    {
      key: "ignoreAppointmentIDs",
      label: "Ignore appointment IDs",
      type: "array",
      advanced: true,
      item: { type: "number" },
      hint: "Appointment IDs to ignore, allowing slots that overlap them.",
    },
  ],
  output: [{ key: "", type: "array", label: "Available times" }],

  execute(input, ctx) {
    return new AcuityClient(ctx).request<unknown[]>("/availability/times", {
      query: {
        date: input.date,
        appointmentTypeID: input.appointmentTypeID,
        calendarID: input.calendarID,
        addonIDs: input.addonIDs,
        timezone: input.timezone,
        ignoreAppointmentIDs: input.ignoreAppointmentIDs,
      },
    });
  },
};

export default availabilityTimeGetMany;
