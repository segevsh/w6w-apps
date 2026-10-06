import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * Read the availability calendar. Wraps three v2 paths that share one response shape
 * (an array of `{user_id, property_id, room_type_id, periods[]}`):
 *
 *   - `GET /v2/availability`                              every property
 *   - `GET /v2/availability/{propertyId}`                 one property
 *   - `GET /v2/availability/{propertyId}/{roomTypeId}`    one room type
 *
 * Query: `start`, `end`, `includeDetails`. A room type is addressed only under its
 * property, so `roomTypeId` without `propertyId` is refused rather than silently ignored.
 */
const action: ActionDefinition = {
  key: "get-availability",
  type: "read",
  resource: "availability",
  title: "Get availability",
  description: "Read the availability calendar for every property, one property or one room " +
    "type over a date range.",
  params: [
    {
      key: "propertyId",
      label: "Property ID",
      type: "number",
      hint: "Leave empty for every property on the account.",
    },
    {
      key: "roomTypeId",
      label: "Room type ID",
      type: "number",
      hint: "Narrow to one room type. Requires a property ID.",
    },
    { key: "start", label: "Start date", type: "date", hint: "Start of the calendar period." },
    { key: "end", label: "End date", type: "date", hint: "End of the calendar period." },
    {
      key: "includeDetails",
      label: "Include booking details",
      type: "boolean",
      hint: "Include detailed booking status information in each period.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Availability per room type, with periods" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const propertyId = asNumber(p.propertyId);
    const roomTypeId = asNumber(p.roomTypeId);
    let path = "/v2/availability";
    if (propertyId !== undefined) {
      path += `/${segment(propertyId)}`;
      if (roomTypeId !== undefined) path += `/${segment(roomTypeId)}`;
    } else if (roomTypeId !== undefined) {
      requireNumber(propertyId, "propertyId (needed alongside roomTypeId)");
    }
    return await new LodgifyClient(ctx).list(path, {
      query: {
        start: asText(p.start),
        end: asText(p.end),
        includeDetails: p.includeDetails === true ? true : undefined,
      },
    });
  },
};

export default action;
