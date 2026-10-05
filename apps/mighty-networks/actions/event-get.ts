import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `GET /events/{id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  id: number;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch one event by id.",
  params: [
    {
      key: "id",
      label: "Event ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Event post id" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "starts_at", type: "string", label: "Start (ISO 8601)" },
    { key: "ends_at", type: "string", label: "End (ISO 8601)" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "location", type: "string", label: "Location" },
    { key: "link", type: "string", label: "External link" },
    { key: "frequency", type: "string", label: "Recurrence frequency" },
    { key: "interval", type: "number", label: "Recurrence interval" },
    { key: "rsvp_enabled", type: "boolean", label: "RSVPs enabled" },
    { key: "rsvp_closed", type: "boolean", label: "RSVPs closed" },
    { key: "permalink", type: "string", label: "Event URL" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/events/${seg(input.id)}/`);
  },
};

export default eventGet;
