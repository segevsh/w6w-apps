import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

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
  output: [
    { key: "show_start_date", type: "boolean", label: "Show start date" },
    { key: "show_end_date", type: "boolean", label: "Show end date" },
    { key: "show_start_end_time", type: "boolean", label: "Show start/end time" },
    { key: "show_timezone", type: "boolean", label: "Show timezone" },
    { key: "show_map", type: "boolean", label: "Show map" },
    { key: "show_remaining", type: "boolean", label: "Show remaining tickets" },
    { key: "show_organizer_facebook", type: "boolean", label: "Show organizer Facebook link" },
    { key: "show_organizer_twitter", type: "boolean", label: "Show organizer Twitter link" },
    { key: "show_facebook_friends_going", type: "boolean", label: "Show Facebook friends going" },
    { key: "terminology", type: "string", label: "Terminology" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/events/${enc(input.eventId)}/display_settings/`, {
      method: "GET",
    });
  },
};

export default action;
