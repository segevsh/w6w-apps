import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { DISPLAY_SETTINGS_OUTPUT, DISPLAY_SETTINGS_SAMPLE } from "../lib/outputs.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-display-settings",
  type: "read",
  resource: "event",
  title: "Get Display Settings",
  description: "Retrieve the display settings (what the event listing shows) for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
  ],
  output: [...DISPLAY_SETTINGS_OUTPUT],
  sample: DISPLAY_SETTINGS_SAMPLE,

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/events/${enc(input.eventId)}/display_settings/`, {
      method: "GET",
    });
  },
};

export default action;
