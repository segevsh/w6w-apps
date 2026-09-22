import type { ActionDefinition } from "@w6w/types";
import {
  AFFILIATE_VIEW,
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/affiliate/viewRecord` — read one Affiliate record.
 *
 * `<crcloud><affiliate><id>…</id></affiliate></crcloud>`, the vendor's own
 * example XML; `id` is required even though that page's Request Parameters
 * table does not list it.
 *
 * The success-response shape was the one thing this vendor's documentation
 * could not verify — there is no example response anywhere and no test account
 * was available — so this action returns the generic envelope and claims no
 * field names. See `lib/client.ts` and the README's disclosed-gaps section.
 */
const viewAffiliate: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "view-affiliate",
  type: "read",
  resource: "affiliate",
  title: "View Affiliate",
  description: "Read one Credit Repair Cloud affiliate by id (POST /api/affiliate/viewRecord).",
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
    return new CreditRepairCloudClient(ctx, AFFILIATE_VIEW).send(input);
  },
};

export default viewAffiliate;
