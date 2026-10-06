import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  term: string;
  continuation?: string;
}

const searchEventTeams: ActionDefinition<Input> = {
  key: "search-event-teams",
  type: "search",
  resource: "team",
  title: "Search Event Teams",
  description: "Search an event's teams by name.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "term", label: "Search term", type: "string", required: true },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "teams", type: "array", label: "Teams" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/teams/search/`, {
      query: { term: input.term, continuation: input.continuation },
    });
  },
};

export default searchEventTeams;
