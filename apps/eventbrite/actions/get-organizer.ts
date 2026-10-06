import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizerId: string;
}

const getOrganizer: ActionDefinition<Input> = {
  key: "get-organizer",
  type: "read",
  idempotent: true,
  resource: "organizer",
  title: "Get Organizer",
  description: "Retrieve a single organizer by ID.",
  params: [
    { key: "organizerId", label: "Organizer ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Organizer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "object", label: "Description" },
    { key: "long_description", type: "object", label: "Long description" },
    { key: "url", type: "string", label: "URL" },
    { key: "website", type: "string", label: "Website" },
    { key: "logo", type: "object", label: "Logo" },
    { key: "num_past_events", type: "number", label: "Past events" },
    { key: "num_future_events", type: "number", label: "Future events" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/organizers/${encodeURIComponent(input.organizerId)}/`);
  },
};

export default getOrganizer;
