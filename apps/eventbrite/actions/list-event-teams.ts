import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  continuation?: string;
}

const listEventTeams: ActionDefinition<Input> = {
  key: "list-event-teams",
  type: "search",
  resource: "team",
  title: "List Event Teams",
  description: "List the teams of an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "teams", type: "array", label: "Teams" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/teams/`, {
      query: { continuation: input.continuation },
    });
  },
};

export default listEventTeams;
