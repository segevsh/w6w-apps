import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";

/** `GET /v2/reservations/{identifier}` — One reservation by UUID or reservation code. */
interface Input {
  identifier: string;
  include?: string;
}

const reservationGet: ActionDefinition<Input> = {
  key: "reservation-get",
  type: "read",
  resource: "reservation",
  title: "Get Reservation",
  description: "Get a reservation by its UUID or its platform reservation code.",
  params: [
    {
      key: "identifier",
      label: "Reservation UUID or code",
      type: "string",
      required: true,
    },
    includeParam(
      "guest, user, financials, listings, properties, review, tasks, smartlock_code",
      "Several need scopes (financials:read, listing:read, property:read, reviews:read, task:read).",
    ),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", `/reservations/${encodeId(input.identifier)}`, {
      query: { include: input.include },
    });
  },
};

export default reservationGet;
