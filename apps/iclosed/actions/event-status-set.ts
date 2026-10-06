import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/events/status` — Activate or deactivate an event.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  status: string;
}

const eventStatusSet: ActionDefinition<Input> = {
  key: "event-status-set",
  type: "perform",
  resource: "event",
  title: "Set event status",
  description: "Activate or deactivate an event.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Event ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "ACTIVATED", label: "Activated" }, {
        value: "DEACTIVATED",
        label: "Deactivated",
      }],
      required: true,
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/events/status", {
      method: "PUT",
      body: compact({ id: input.id, status: input.status }),
    });
  },
};

export default eventStatusSet;
