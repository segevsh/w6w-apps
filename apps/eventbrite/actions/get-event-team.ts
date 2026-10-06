import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  teamId: string;
}

const getEventTeam: ActionDefinition<Input> = {
  key: "get-event-team",
  type: "read",
  resource: "team",
  title: "Get Event Team",
  description: "Retrieve a single team of an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "teamId", label: "Team ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Team name" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/teams/${encodeURIComponent(input.teamId)}/`,
    );
  },
};

export default getEventTeam;
