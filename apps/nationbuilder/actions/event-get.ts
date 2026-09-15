import type { ActionDefinition } from "@w6w/types";
import { flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

/** `GET /api/v2/events/{id}` — confirmed against the vendor's OpenAPI spec. */
const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch an event by id.",
  params: [{ key: "eventId", label: "Event ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "start_at", type: "string", label: "Start time" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>(
      `/events/${encodeURIComponent(input.eventId)}`,
    );
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default eventGet;
