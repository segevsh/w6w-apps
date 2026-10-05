import type { ActionDefinition } from "@w6w/types";
import { compact, DemioClient } from "../lib/client.ts";

interface Input {
  type?: string;
}

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "List active (not canceled) events, one entry per event ordered by its next " +
    "session, each with its next session's `date_id`, status, timestamp and registration URL.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      hint: "Leave empty for all active events.",
      options: [
        { label: "Upcoming", value: "upcoming" },
        { label: "Past", value: "past" },
        { label: "Automated", value: "automated" },
      ],
    },
  ],
  output: [{ key: "events", type: "array", label: "Events" }],

  async execute(input, ctx) {
    const events = await new DemioClient(ctx).request<unknown[]>("/events", {
      query: compact({ type: input.type }),
    });
    return { events: events ?? [] };
  },
};

export default eventList;
