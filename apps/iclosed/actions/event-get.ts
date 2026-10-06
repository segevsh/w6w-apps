import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/events/detail` — Fetch one event by ID or link prefix.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id?: number;
  linkPrefix?: string;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get event",
  description: "Fetch one event by ID or link prefix.",
  params: [
    {
      key: "id",
      label: "Event ID",
      type: "number",
      validation: { integer: true },
      hint: "Give this or Link prefix.",
    },
    {
      key: "linkPrefix",
      label: "Link prefix",
      type: "string",
      hint: "username/event-name",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The event" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/events/detail", {
      query: { id: input.id, linkPrefix: input.linkPrefix },
    });
  },
};

export default eventGet;
