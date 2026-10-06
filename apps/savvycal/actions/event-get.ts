import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a single event by ID.",
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    required: true,
    placeholder: "event_01KKGY70MFPCECSQ6KM6FMDPC3",
  }],
  output: [{ key: "id", type: "string", label: "Event ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/events/${encodeId(input.eventId)}`);
  },
};

export default eventGet;
