import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient, uuidOf } from "../lib/client.ts";

interface Input {
  event: string;
  invitee: string;
}

/**
 * GET /scheduled_events/{event_uuid}/invitees/{invitee_uuid} — a single invitee,
 * which carries the answers to the booking questions, cancellation state and
 * tracking (UTM) fields. Both ids accept a URI or a bare UUID.
 */
const inviteeGet: ActionDefinition<Input> = {
  key: "invitee-get",
  type: "read",
  resource: "invitee",
  title: "Get Event Invitee",
  description:
    "Fetch a single invitee of a scheduled event (GET /scheduled_events/{uuid}/invitees/{uuid}).",
  params: [
    {
      key: "event",
      label: "Event URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/scheduled_events/DDDD or just DDDD.",
    },
    {
      key: "invitee",
      label: "Invitee URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/scheduled_events/DDDD/invitees/EEEE or just EEEE.",
    },
  ],
  output: [
    { key: "resource", type: "object", label: "Invitee" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request(
      `/scheduled_events/${encodeURIComponent(uuidOf(input.event))}/invitees/${
        encodeURIComponent(uuidOf(input.invitee))
      }`,
    );
  },
};

export default inviteeGet;
