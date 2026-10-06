import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";
import { reservationBody, type ReservationFields, reservationParams } from "../lib/reservation.ts";

/** `PUT /v2/reservations/{identifier}` — Update a reservation (partial or full, by token and origin). */
interface Input extends ReservationFields {
  identifier: string;
  checkin_time?: string;
  checkout_time?: string;
  include?: string;
}

const reservationUpdate: ActionDefinition<Input> = {
  key: "reservation-update",
  type: "perform",
  resource: "reservation",
  title: "Update Reservation",
  description:
    "Update a reservation. On Direct and OTA bookings only the notes and the check-in/check-out times can change (any other field is a 403); manual bookings accept every field. Send only what should change. Needs reservation:write.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Reservation UUID", type: "string", required: true },
    ...reservationParams(false).filter((p) => p.key !== "language"),
    {
      key: "checkin_time",
      label: "Check-in time",
      type: "string",
      placeholder: "15:00",
      hint: "24-hour H:MM, e.g. 15:45 (not 3:45 pm).",
    },
    {
      key: "checkout_time",
      label: "Check-out time",
      type: "string",
      placeholder: "11:00",
      hint: "24-hour H:MM.",
    },
    includeParam("guest, user, financials, listings, properties, review"),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    const { language: _language, ...rest } = reservationBody(input);
    const body = {
      ...rest,
      ...(input.checkin_time ? { checkin_time: input.checkin_time } : {}),
      ...(input.checkout_time ? { checkout_time: input.checkout_time } : {}),
    };
    return new HospitableClient(ctx).request("PUT", `/reservations/${encodeId(input.identifier)}`, {
      query: { include: input.include },
      body,
    });
  },
};

export default reservationUpdate;
