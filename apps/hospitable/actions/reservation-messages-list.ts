import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";

/** `GET /v2/reservations/{uuid}/messages` — The message thread of a reservation. */
interface Input {
  uuid: string;
}

const reservationMessagesList: ActionDefinition<Input> = {
  key: "reservation-messages-list",
  type: "read",
  resource: "message",
  title: "List Reservation Messages",
  description:
    "List the messages exchanged with a guest on a reservation. Needs message:read; the vendor allows 2 requests per minute per reservation.",
  params: [{ key: "uuid", label: "Reservation UUID", type: "string", required: true }],
  output: [{ key: "data", type: "array", label: "Messages" }],

  execute(input, ctx) {
    return new HospitableClient(ctx).request(
      "GET",
      `/reservations/${encodeId(input.uuid)}/messages`,
    );
  },
};

export default reservationMessagesList;
