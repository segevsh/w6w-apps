import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/eventCalls/markSlotFree` — Mark a booked slot as free (or busy again) on the host's calendar.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  isSlotFree: boolean;
}

const callSlotFreeSet: ActionDefinition<Input> = {
  key: "call-slot-free-set",
  type: "perform",
  resource: "call",
  title: "Mark booked slot free",
  description: "Mark a booked slot as free (or busy again) on the host's calendar.",
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
      key: "isSlotFree",
      label: "Slot is free",
      type: "boolean",
      required: true,
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Result message" },
    { key: "data", type: "object", label: "{id, isSlotFree}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/eventCalls/markSlotFree", {
      method: "PUT",
      body: compact({ id: input.id, isSlotFree: input.isSlotFree }),
    });
  },
};

export default callSlotFreeSet;
