import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  sourceSeatmapId: string;
}

const action: ActionDefinition<Input> = {
  key: "create-seat-map",
  type: "perform",
  idempotent: false,
  resource: "seat_map",
  title: "Create Seat Map",
  description:
    "Create the Seat Map of a new reserved-seating Event on Eventbrite by copying an existing Seat Map. Errors if the event already has one.",
  params: [
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "sourceSeatmapId",
      "label": "Source seat map ID",
      "type": "string",
      "required": true,
      "hint": "ID of the Seat Map to copy, e.g. E12345-m1. Find it with List Seat Maps.",
    },
  ],
  output: [
    {
      "key": "name",
      "type": "string",
      "label": "Name",
    },
    {
      "key": "event_id",
      "type": "string",
      "label": "Event ID",
    },
    {
      "key": "venue_id",
      "type": "string",
      "label": "Venue ID",
    },
    {
      "key": "capacity",
      "type": "number",
      "label": "Capacity",
    },
    {
      "key": "thumbnail_url",
      "type": "string",
      "label": "Thumbnail URL",
    },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/seatmaps/`, {
      method: "POST",
      body: { source_seatmap_id: input.sourceSeatmapId },
    });
  },
};

export default action;
