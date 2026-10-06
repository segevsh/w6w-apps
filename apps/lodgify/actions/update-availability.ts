import type { ActionDefinition } from "@w6w/types";
import { asNumber, LodgifyClient, requireNumber, requireText, segment } from "../lib/client.ts";

/**
 * Set the available units of a room type for a period. Wraps
 * `POST /v1/availability/{propertyId}/{roomTypeId}/set` ("Updates the number of
 * available units for a specific room type"). Body: `{period_start, period_end,
 * available}` (date-time, date-time, int32). The success body is empty.
 *
 * Setting the same period twice yields the same state, so the action is idempotent.
 */
const action: ActionDefinition = {
  key: "update-availability",
  type: "perform",
  idempotent: true,
  resource: "availability",
  title: "Set available units",
  description: "Set the number of available units of a room type for a date range (0 closes " +
    "the dates).",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    { key: "roomTypeId", label: "Room type ID", type: "number", required: true },
    { key: "periodStart", label: "Period start", type: "date", required: true },
    { key: "periodEnd", label: "Period end", type: "date", required: true },
    {
      key: "available",
      label: "Available units",
      type: "number",
      required: true,
      hint: "Number of units that can be booked in the period.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const propertyId = requireNumber(p.propertyId, "propertyId");
    const roomTypeId = requireNumber(p.roomTypeId, "roomTypeId");
    return await new LodgifyClient(ctx).command(
      `/v1/availability/${segment(propertyId)}/${segment(roomTypeId)}/set`,
      {
        method: "POST",
        body: {
          period_start: requireText(p.periodStart, "periodStart"),
          period_end: requireText(p.periodEnd, "periodEnd"),
          available: requireNumber(asNumber(p.available), "available"),
        },
      },
    );
  },
};

export default action;
