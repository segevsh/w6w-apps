import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/events/eventDates` — List the open dates and times for an event.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  linkPrefix: string;
  timeZone?: string;
  currentDate?: string;
  conditionalUsers?: string;
  routingGroupIds?: string;
}

const eventDatesList: ActionDefinition<Input> = {
  key: "event-dates-list",
  type: "search",
  resource: "event",
  title: "Get event dates",
  description: "List the open dates and times for an event.",
  params: [
    {
      key: "linkPrefix",
      label: "Link prefix",
      type: "string",
      required: true,
      hint: "username/event-name",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      hint: "IANA time zone.",
    },
    {
      key: "currentDate",
      label: "Current date",
      type: "string",
    },
    {
      key: "conditionalUsers",
      label: "Conditional users",
      type: "string",
    },
    {
      key: "routingGroupIds",
      label: "Routing group IDs",
      type: "string",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{availabilities, appliedHostIds}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/events/eventDates", {
      method: "POST",
      body: compact({
        linkPrefix: input.linkPrefix,
        timeZone: input.timeZone,
        currentDate: input.currentDate,
        conditionalUsers: input.conditionalUsers,
        routingGroupIds: input.routingGroupIds,
      }),
    });
  },
};

export default eventDatesList;
