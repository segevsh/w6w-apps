import type { ActionDefinition } from "@w6w/types";
import { DemioClient } from "../lib/client.ts";

interface Input {
  eventId: number;
  activeOnly?: boolean;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Get one event with its registration URL, `next_date_id` and every session " +
    "(scheduled, running and finished), ordered by date.",
  params: [
    { key: "eventId", label: "Event ID", type: "number", required: true },
    {
      key: "activeOnly",
      label: "Active dates only",
      type: "boolean",
      hint: "Return only the active dates in the series.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Event ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "registration_url", type: "string", label: "Registration URL" },
    { key: "next_date_id", type: "number", label: "Next session ID" },
    { key: "dates", type: "array", label: "Sessions" },
  ],

  async execute(input, ctx) {
    return await new DemioClient(ctx).request(
      `/event/${encodeURIComponent(String(input.eventId))}`,
      {
        query: { active: input.activeOnly },
      },
    );
  },
};

export default eventGet;
