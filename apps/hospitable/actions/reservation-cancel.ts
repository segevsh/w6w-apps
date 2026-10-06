import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";

/** `POST /v2/reservations/{uuid}/cancel` — Cancel a manual reservation. */
interface Input {
  uuid: string;
  initiated_by?: string;
  include?: string;
}

const reservationCancel: ActionDefinition<Input> = {
  key: "reservation-cancel",
  type: "perform",
  resource: "reservation",
  title: "Cancel Manual Reservation",
  description:
    "Cancel a manual reservation. Only manual reservations can be cancelled here, and only by a Personal Access Token or the vendor that created it. Needs reservation:write.",
  idempotent: false,
  params: [
    { key: "uuid", label: "Reservation UUID", type: "string", required: true },
    {
      key: "initiated_by",
      label: "Cancelled by",
      type: "select",
      options: [{ value: "host", label: "Host" }, { value: "guest", label: "Guest" }],
    },
    includeParam("guest, user, financials, listings, properties, review"),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request(
      "POST",
      `/reservations/${encodeId(input.uuid)}/cancel`,
      {
        query: { include: input.include },
        body: input.initiated_by ? { initiated_by: input.initiated_by } : {},
      },
    );
  },
};

export default reservationCancel;
