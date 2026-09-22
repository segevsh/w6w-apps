import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { propertyIdParam } from "../lib/params.ts";

/**
 * `GET /getReservation` — one reservation, by id.
 *
 * `reservationID` is the operation's only `required` parameter and the only way
 * to name a reservation; ids come from `reservation-list` or from the
 * reservation-create response.
 *
 * `includeGuestRequirements` is off by default. The vendor documents no
 * dependency on a "include guests details" flag here (unlike `getReservations`,
 * where it needs `includeGuestsDetails`), so it is exposed on its own.
 */
interface Input {
  reservationID: string;
  propertyID?: string;
  includeGuestRequirements?: boolean;
}

const reservationGet: ActionDefinition<Input> = {
  key: "reservation-get",
  type: "read",
  resource: "reservation",
  title: "Get Reservation",
  description: "Get one reservation by ID.",
  params: [
    {
      key: "reservationID",
      label: "Reservation ID",
      type: "string",
      required: true,
      hint: "From a `reservation-list` row or the create response.",
    },
    propertyIdParam,
    {
      key: "includeGuestRequirements",
      label: "Include guest requirements",
      type: "boolean",
      hint: "Off by default, matching the API.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Reservation" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<Record<string, unknown>>>(
      "/getReservation",
      {
        query: {
          reservationID: input.reservationID,
          propertyID: input.propertyID,
          includeGuestRequirements: input.includeGuestRequirements,
        },
      },
    );
  },
};

export default reservationGet;
