import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";
import { EVENT_OUTPUT } from "./create-event.ts";

interface Input {
  eventId: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  summary?: string;
  extra?: Record<string, unknown>;
}

const copyEvent: ActionDefinition<Input> = {
  key: "copy-event",
  type: "perform",
  idempotent: false,
  resource: "event",
  title: "Copy Event",
  description:
    "Duplicate an event on Eventbrite, creating a new event with a new ID. Payment options, payout method, refund policy and tax settings are copied. Optionally override name, dates, timezone and summary on the copy.",
  params: [
    { key: "eventId", label: "Event ID to copy", type: "string", required: true },
    { key: "name", label: "Name of the new event", type: "string" },
    { key: "startDate", label: "Start (UTC)", type: "string", hint: "ISO 8601 UTC datetime." },
    { key: "endDate", label: "End (UTC)", type: "string", hint: "ISO 8601 UTC datetime." },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Olson name, e.g. `Europe/Paris`.",
    },
    { key: "summary", label: "Summary", type: "text" },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Object deep-merged into the request body.",
    },
  ],
  output: [...EVENT_OUTPUT],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.name) body.name = input.name;
    if (input.startDate) body.start_date = input.startDate;
    if (input.endDate) body.end_date = input.endDate;
    if (input.timezone) body.timezone = input.timezone;
    if (input.summary) body.summary = input.summary;
    return client.request(`/events/${encodeURIComponent(input.eventId)}/copy/`, {
      method: "POST",
      body: input.extra ? deepMerge(body, input.extra) : body,
    });
  },
};

export default copyEvent;
