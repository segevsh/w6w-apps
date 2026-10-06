import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  calendarId: string;
  startDate: string;
  endDate: string;
  eventType?: string;
  jobId?: string;
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "appointment-list",
  type: "read",
  resource: "calendar",
  title: "List Calendar Appointments",
  description:
    "List a calendar's appointments within a date range, optionally for one job or one event type.",
  params: [
    idParam("calendarId", "Calendar id", "From List Calendars."),
    { key: "startDate", label: "Start date", type: "string", required: true, hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End date", type: "string", required: true, hint: "YYYY-MM-DD." },
    {
      key: "eventType",
      label: "Event type",
      type: "string",
      hint:
        "Comma-separated: All, Personal, InitialAppointment, MaterialDelivery, CrewLabor. Defaults to All.",
    },
    {
      key: "jobId",
      label: "Job id",
      type: "string",
      advanced: true,
      hint: "Only appointments for this job.",
    },
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      `/calendars/${encodeId(input.calendarId)}/appointments`,
      {
        ...pageQuery(input, "recordStartIndex"),
        startDate: input.startDate,
        endDate: input.endDate,
        eventType: input.eventType,
        jobId: input.jobId,
      },
    );
  },
};

export default action;
