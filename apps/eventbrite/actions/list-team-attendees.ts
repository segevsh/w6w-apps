import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  teamId: string;
  continuation?: string;
}

const listTeamAttendees: ActionDefinition<Input> = {
  key: "list-team-attendees",
  type: "search",
  resource: "team",
  title: "List Team Attendees",
  description: "List the attendees of a single event team.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "teamId", label: "Team ID", type: "string", required: true },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "attendees", type: "array", label: "Attendees" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/teams/${
        encodeURIComponent(input.teamId)
      }/attendees/`,
      { query: { continuation: input.continuation } },
    );
  },
};

export default listTeamAttendees;
