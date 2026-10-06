import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";
import { reservationBody, type ReservationFields, reservationParams } from "../lib/reservation.ts";

/** `POST /v2/reservations` — Create a manual reservation. */
interface Input extends ReservationFields {
  property_id: string;
  channel?: string;
  reservation_code?: string;
  include?: string;
}

const reservationCreate: ActionDefinition<Input> = {
  key: "reservation-create",
  type: "perform",
  resource: "reservation",
  title: "Create Manual Reservation",
  description:
    "Create a manual reservation with guest details, dates and financials. Needs the reservation:write scope. With a Personal Access Token, minimum-stay rules and blocked dates are ignored, but it cannot overlap an existing booking.",
  idempotent: false,
  params: [
    { key: "property_id", label: "Property UUID", type: "string", required: true },
    ...reservationParams(true),
    { key: "channel", label: "Channel", type: "string", hint: "Optional channel label." },
    {
      key: "reservation_code",
      label: "Reservation code",
      type: "string",
      hint: "Optional code to give the reservation.",
    },
    includeParam("guest, user, financials, listings, properties, review"),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    const body = {
      property_id: input.property_id,
      ...reservationBody(input),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.reservation_code ? { reservation_code: input.reservation_code } : {}),
    };
    return new HospitableClient(ctx).request("POST", "/reservations", {
      query: { include: input.include },
      body,
    });
  },
};

export default reservationCreate;
