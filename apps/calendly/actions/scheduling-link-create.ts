import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient } from "../lib/client.ts";

interface Input {
  owner: string;
  maxEventCount?: number;
}

/**
 * POST /scheduling_links — mint a single-use booking link for an event type. The
 * `owner` is the event type's URI; `owner_type` is fixed to `EventType`. Calendly
 * currently only supports `max_event_count: 1`, which is the default here.
 */
const schedulingLinkCreate: ActionDefinition<Input> = {
  key: "scheduling-link-create",
  type: "perform",
  resource: "scheduling-link",
  title: "Create Scheduling Link",
  description: "Create a single-use scheduling link for an event type (POST /scheduling_links).",
  idempotent: false,
  params: [
    {
      key: "owner",
      label: "Event Type URI",
      type: "string",
      required: true,
      hint: "The event type to book, e.g. https://api.calendly.com/event_types/CCCC.",
    },
    {
      key: "maxEventCount",
      label: "Max event count",
      type: "number",
      default: 1,
      hint: "How many bookings the link allows. Calendly currently supports 1 only.",
      validation: { min: 1, max: 1, integer: true },
    },
  ],
  output: [
    { key: "resource", type: "object", label: "Scheduling link" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request("/scheduling_links", {
      method: "POST",
      body: {
        max_event_count: input.maxEventCount ?? 1,
        owner: input.owner,
        owner_type: "EventType",
      },
    });
  },
};

export default schedulingLinkCreate;
