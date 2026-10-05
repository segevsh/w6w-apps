import type { ActionDefinition } from "@w6w/types";
import { DemioClient } from "../lib/client.ts";

interface Input {
  eventId: number;
  dateId: number;
}

const sessionGet: ActionDefinition<Input> = {
  key: "session-get",
  type: "read",
  resource: "session",
  title: "Get Event Session",
  description: "Get one session (event date): its status, Unix timestamp and timezone.",
  params: [
    { key: "eventId", label: "Event ID", type: "number", required: true },
    { key: "dateId", label: "Session (date) ID", type: "number", required: true },
  ],
  output: [
    { key: "date_id", type: "number", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "timestamp", type: "number", label: "Unix timestamp" },
    { key: "datetime", type: "string", label: "Date/time" },
    { key: "zone", type: "string", label: "Timezone" },
  ],

  async execute(input, ctx) {
    return await new DemioClient(ctx).request(
      `/event/${encodeURIComponent(String(input.eventId))}/date/${
        encodeURIComponent(String(input.dateId))
      }`,
    );
  },
};

export default sessionGet;
