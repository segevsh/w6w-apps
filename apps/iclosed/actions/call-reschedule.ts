import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/eventCalls/reschedule` — Move a booked call to a new time.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  dateTime: string;
  timeZone: string;
  rescheduleReason?: string;
  notes?: string;
  userId?: number;
  additionalGuests?: unknown;
}

const callReschedule: ActionDefinition<Input> = {
  key: "call-reschedule",
  type: "perform",
  resource: "call",
  title: "Reschedule call",
  description: "Move a booked call to a new time.",
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
      key: "dateTime",
      label: "New date and time",
      type: "string",
      required: true,
      hint: "ISO 8601.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      required: true,
      hint: "IANA time zone.",
    },
    {
      key: "rescheduleReason",
      label: "Reason",
      type: "string",
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
    },
    {
      key: "userId",
      label: "Host user ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "additionalGuests",
      label: "Additional guests",
      type: "json",
      hint: 'JSON array of {"email","name"}.',
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "status", type: "number", label: "Status" },
    { key: "data", type: "object", label: "The rescheduled call" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/eventCalls/reschedule", {
      method: "PUT",
      body: compact({
        id: input.id,
        dateTime: input.dateTime,
        timeZone: input.timeZone,
        rescheduleReason: input.rescheduleReason,
        notes: input.notes,
        userId: input.userId,
        additionalGuests: asOptionalJson(input.additionalGuests, "Additional guests"),
      }),
    });
  },
};

export default callReschedule;
