import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { TEAM_LIST_OUTPUT, TEAM_LIST_SAMPLE } from "../lib/outputs.ts";

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
  output: TEAM_LIST_OUTPUT,
  sample: TEAM_LIST_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/teams/`, {
      query: { continuation: input.continuation },
    });
  },
};

export default listEventTeams;
