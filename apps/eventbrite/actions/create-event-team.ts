import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  publicEventId: string;
  name?: string;
  password?: string;
  preferredStartTime?: string;
  extra?: Record<string, unknown>;
}

const createEventTeam: ActionDefinition<Input> = {
  key: "create-event-team",
  type: "perform",
  idempotent: false,
  resource: "team",
  title: "Create Event Team",
  description: "Create a team for an event on Eventbrite.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "publicEventId", label: "Public event ID", type: "string", required: true },
    { key: "name", label: "Team name", type: "string" },
    { key: "password", label: "Team password", type: "secret" },
    { key: "preferredStartTime", label: "Preferred start time", type: "string" },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Team name" },
    { key: "token", type: "string", label: "Team token" },
    { key: "spots_left", type: "number", label: "Spots left" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = {
      public_event_id: input.publicEventId,
      name: input.name,
      password: input.password,
      preferred_start_time: input.preferredStartTime,
    };
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
    Object.assign(body, input.extra ?? {});
    return client.request(`/events/${encodeURIComponent(input.eventId)}/teams/create/`, {
      method: "POST",
      body,
    });
  },
};

export default createEventTeam;
