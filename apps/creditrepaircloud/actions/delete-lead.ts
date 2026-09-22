import type { ActionDefinition } from "@w6w/types";
import {
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  LEAD_DELETE,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/lead/deleteRecord` — delete a Lead/Client record.
 *
 * The document is one line of nested XML — `<crcloud><client><id>…</id></client>
 * </crcloud>` — where the wrapper is `<client>`, not `<lead>`, even though the
 * method is `/api/lead/deleteRecord`. That is the vendor's own example XML on
 * that page, followed verbatim.
 *
 * `idempotent: true` (the pack's convention for deletes): a retry cannot delete
 * the same record twice. One wrinkle worth knowing, and why this action is
 * documented rather than silent — a second delete of a record that is already
 * gone is NOT a no-op on the wire: Credit Repair Cloud answers with an error
 * (4413 "Incorrect Client ID"), which surfaces as a failed step even though the
 * record is in the intended state.
 */
const deleteLead: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "delete-lead",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description:
    "Delete a Credit Repair Cloud lead or client record by id (POST /api/lead/deleteRecord).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The id exactly as the API expects it — the vendor's example XML passes the encoded " +
        "form (`<id>MQ==</id>`), not the plain integer shown in the CRM.",
    },
  ],
  output: ENVELOPE_OUTPUT,

  execute(input, ctx) {
    return new CreditRepairCloudClient(ctx, LEAD_DELETE).send(input);
  },
};

export default deleteLead;
