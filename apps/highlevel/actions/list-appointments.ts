import type { ActionDefinition } from "@w6w/types";
import { CALENDAR_API_VERSION, HighLevelClient } from "../lib/client.ts";

interface Input {
  startTime: number;
  endTime: number;
  calendarId?: string;
  userId?: string;
  groupId?: string;
}

const listAppointments: ActionDefinition<Input> = {
  key: "list-appointments",
  type: "read",
  resource: "appointment",
  title: "List Calendar Events",
  description:
    "List calendar events (appointments, blocked slots) in a time window. `startTime`/`endTime` " +
    "are Unix epoch milliseconds.",
  params: [
    { key: "startTime", label: "Start time (ms)", type: "number", required: true },
    { key: "endTime", label: "End time (ms)", type: "number", required: true },
    { key: "calendarId", label: "Calendar ID", type: "string" },
    { key: "userId", label: "User ID", type: "string" },
    { key: "groupId", label: "Calendar group ID", type: "string" },
  ],
  output: [{ key: "events", type: "array", label: "Calendar events" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/calendars/events", {
      version: CALENDAR_API_VERSION,
      query: {
        locationId: client.locationId,
        startTime: input.startTime,
        endTime: input.endTime,
        calendarId: input.calendarId,
        userId: input.userId,
        groupId: input.groupId,
      },
    });
  },
};

export default listAppointments;
