import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { propertyIdParam } from "../lib/params.ts";

/**
 * `GET /getGuest` — one guest, by reservation or by guest id.
 *
 * The vendor marks all four parameters optional and then documents the actual
 * rule in the two id descriptions: `reservationID` is "required if no guestID
 * is provided" and vice versa. So the action declares nothing required — a
 * schema-level `required: true` on either one would make the other unusable —
 * and says in the hints that at least one of the two is needed for a useful
 * answer.
 */
interface Input {
  propertyID?: string;
  reservationID?: string;
  guestID?: string;
  includeGuestRequirements?: boolean;
}

const guestGet: ActionDefinition<Input> = {
  key: "guest-get",
  type: "read",
  resource: "guest",
  title: "Get Guest",
  description: "Get a guest's record, by guest ID or by reservation ID.",
  params: [
    {
      key: "guestID",
      label: "Guest ID",
      type: "string",
      hint: "Needed if no reservation ID is given. Comes from `guest-list` or a reservation's " +
        "guest details.",
    },
    {
      key: "reservationID",
      label: "Reservation ID",
      type: "string",
      hint: "Needed if no guest ID is given. Returns the primary guest of that reservation.",
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
    { key: "data", type: "object", label: "Guest" },
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<Record<string, unknown>>>(
      "/getGuest",
      {
        query: {
          propertyID: input.propertyID,
          reservationID: input.reservationID,
          guestID: input.guestID,
          includeGuestRequirements: input.includeGuestRequirements,
        },
      },
    );
  },
};

export default guestGet;
