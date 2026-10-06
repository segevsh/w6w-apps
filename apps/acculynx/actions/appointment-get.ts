import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  calendarId: string;
  appointmentId: string;
}

const action: ActionDefinition<Input> = {
  key: "appointment-get",
  type: "read",
  resource: "calendar",
  title: "Get Appointment",
  description: "Get one calendar appointment's details.",
  params: [
    idParam("calendarId", "Calendar id"),
    idParam("appointmentId", "Appointment id"),
  ],
  output: [
    { key: "id", type: "string", label: "Appointment id" },
    { key: "start", type: "string", label: "Start (ISO 8601)" },
    { key: "end", type: "string", label: "End (ISO 8601)" },
    { key: "allDay", type: "boolean", label: "All-day flag" },
    { key: "jobId", type: "string", label: "Job id" },
    { key: "jobName", type: "string", label: "Job name" },
    { key: "location", type: "string", label: "Location" },
    { key: "notes", type: "string", label: "Notes" },
    { key: "eventType", type: "string", label: "Event type" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      `/calendars/${encodeId(input.calendarId)}/appointments/${encodeId(input.appointmentId)}`,
    );
  },
};

export default action;
