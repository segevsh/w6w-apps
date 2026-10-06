import type { ActionDefinition } from "@w6w/types";
import { asJson, LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * Update room access key codes. Wraps `PUT /v2/reservations/bookings/{id}/keyCodes`
 * ("Updates the access key codes of rooms belonging to a given booking"). Body
 * `{rooms: [{room_type_id, key_code}]}`; the response echoes the same shape.
 */
const action: ActionDefinition = {
  key: "update-booking-key-codes",
  type: "perform",
  idempotent: true,
  resource: "booking",
  title: "Update a booking's key codes",
  description: "Set the access key code of each room on a booking, e.g. a smart-lock code.",
  params: [
    { key: "bookingId", label: "Booking ID", type: "number", required: true },
    {
      key: "rooms",
      label: "Rooms",
      type: "json",
      required: true,
      hint: 'Array of {"room_type_id": 123, "key_code": "4821"}.',
    },
  ],
  output: [{ key: "rooms", type: "array", label: "Rooms with their key codes" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    const rooms = asJson<unknown[]>(p.rooms, "rooms");
    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw new Error("`rooms` must be a non-empty array");
    }
    return await new LodgifyClient(ctx).request(
      `/v2/reservations/bookings/${segment(id)}/keyCodes`,
      { method: "PUT", body: { rooms } },
    );
  },
};

export default action;
