import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/eventCalls/cancel` — Cancel a booked call.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  cancelReason?: string;
}

const callCancel: ActionDefinition<Input> = {
  key: "call-cancel",
  type: "perform",
  resource: "call",
  title: "Cancel call",
  description: "Cancel a booked call.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Call ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "cancelReason",
      label: "Reason",
      type: "string",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{eventCall: {message, status}}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/eventCalls/cancel", {
      method: "PUT",
      body: compact({ id: input.id, cancelReason: input.cancelReason }),
    });
  },
};

export default callCancel;
