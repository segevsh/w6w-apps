import type { ActionDefinition } from "@w6w/types";
import { CALENDAR_API_VERSION, HighLevelClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  contactId: string;
  startTime: string;
  endTime?: string;
  title?: string;
  appointmentStatus?: string;
  assignedUserId?: string;
  address?: string;
  ignoreFreeSlotValidation?: boolean;
}

const createAppointment: ActionDefinition<Input> = {
  key: "create-appointment",
  type: "perform",
  resource: "appointment",
  title: "Create Appointment",
  description: "Book an appointment on a calendar for a contact.",
  idempotent: false,
  params: [
    { key: "calendarId", label: "Calendar ID", type: "string", required: true },
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "startTime",
      label: "Start time",
      type: "string",
      required: true,
      hint: "ISO 8601 with offset, e.g. 2026-08-10T15:00:00-05:00.",
    },
    { key: "endTime", label: "End time", type: "string", hint: "ISO 8601 with offset." },
    { key: "title", label: "Title", type: "string" },
    {
      key: "appointmentStatus",
      label: "Status",
      type: "select",
      default: "confirmed",
      options: [
        { value: "new", label: "New" },
        { value: "confirmed", label: "Confirmed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "showed", label: "Showed" },
        { value: "noshow", label: "No-show" },
        { value: "invalid", label: "Invalid" },
      ],
    },
    { key: "assignedUserId", label: "Assigned user ID", type: "string" },
    { key: "address", label: "Address / meeting location", type: "string" },
    {
      key: "ignoreFreeSlotValidation",
      label: "Ignore free-slot validation",
      type: "boolean",
      default: false,
      hint: "Book even if the slot isn't in the calendar's computed availability.",
    },
  ],
  output: [{ key: "appointment", type: "object", label: "Created appointment" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/calendars/events/appointments", {
      method: "POST",
      version: CALENDAR_API_VERSION,
      body: {
        locationId: client.locationId,
        calendarId: input.calendarId,
        contactId: input.contactId,
        startTime: input.startTime,
        endTime: input.endTime,
        title: input.title,
        appointmentStatus: input.appointmentStatus ?? "confirmed",
        assignedUserId: input.assignedUserId,
        address: input.address,
        ignoreFreeSlotValidation: input.ignoreFreeSlotValidation ?? false,
      },
    });
  },
};

export default createAppointment;
