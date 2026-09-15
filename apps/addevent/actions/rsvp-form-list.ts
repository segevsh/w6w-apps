import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventRsvpForm } from "../lib/schema.ts";

/**
 * `GET /events/rsvp-forms` — list this account's custom RSVP forms, newest first.
 *
 * A form's `id` is the value to pass as `rsvpFormId` on Create/Update Event.
 * Answers a bare JSON array — there is no pagination envelope on this endpoint.
 */
const rsvpFormList: ActionDefinition<Record<string, never>> = {
  key: "rsvp-form-list",
  type: "read",
  resource: "template",
  title: "List RSVP Forms",
  description: "List your custom RSVP forms, sorted by creation date, newest first.",
  params: [],
  output: [
    { key: "items", type: "array", label: "RSVP forms" },
  ],

  async execute(_input, ctx) {
    const items = await new AddEventClient(ctx).json<AddEventRsvpForm[]>("/events/rsvp-forms");
    return { items: items ?? [] };
  },
};

export default rsvpFormList;
