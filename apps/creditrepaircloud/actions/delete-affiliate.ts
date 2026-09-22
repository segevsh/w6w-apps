import type { ActionDefinition } from "@w6w/types";
import {
  AFFILIATE_DELETE,
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/affiliate/deleteRecord` — delete an Affiliate record.
 *
 * The document is `<crcloud><affiliate><id>…</id></affiliate></crcloud>`, the
 * vendor's own example XML. As on the lead side, the page's Request Parameters
 * table omits `id` while its example carries it, and a delete cannot work
 * without one — required here.
 *
 * `idempotent: true` (the pack's convention for deletes): a retry cannot delete
 * the same affiliate twice. Note that a second delete of an already-deleted
 * affiliate is not a silent no-op on the wire — the vendor answers 4417
 * "Incorrect Affiliate ID", which surfaces as a failed step.
 */
const deleteAffiliate: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "delete-affiliate",
  type: "perform",
  resource: "affiliate",
  title: "Delete Affiliate",
  description: "Delete a Credit Repair Cloud affiliate by id (POST /api/affiliate/deleteRecord).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Affiliate ID",
      type: "string",
      required: true,
      hint: "The id exactly as the API expects it — the vendor's example XML passes the encoded " +
        "form, not the plain integer shown in the CRM.",
    },
  ],
  output: ENVELOPE_OUTPUT,

  execute(input, ctx) {
    return new CreditRepairCloudClient(ctx, AFFILIATE_DELETE).send(input);
  },
};

export default deleteAffiliate;
