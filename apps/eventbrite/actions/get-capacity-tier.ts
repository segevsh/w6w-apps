import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { CAPACITY_TIER_OUTPUT, CAPACITY_TIER_SAMPLE } from "../lib/outputs.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-capacity-tier",
  type: "read",
  resource: "capacity",
  title: "Get Capacity Tier",
  description:
    "Retrieve the capacity tier (total capacity and general admission holds) for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
  ],
  output: CAPACITY_TIER_OUTPUT,
  sample: CAPACITY_TIER_SAMPLE,

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/events/${enc(input.eventId)}/capacity_tier/`, {
      method: "GET",
    });
  },
};

export default action;
