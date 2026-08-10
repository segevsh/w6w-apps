import type { ActionDefinition } from "@w6w/types";
import { identifierList, KajabiClient } from "../lib/client.ts";
import { idListParam, relationshipOutput } from "../lib/params.ts";

/**
 * `DELETE /v1/contacts/{contact_id}/relationships/offers` — take access away.
 *
 * Removes only the offers named; anything else the contact holds survives.
 * Like the tag removal route, the ids travel in the request **body** rather
 * than the path.
 *
 * ## This is access, not billing
 *
 * Revoking an offer removes the contact's access to whatever it grants. It does
 * **not** touch any subscription that may be paying for it — that is
 * `purchase-cancel-subscription`, on a different resource entirely. Doing only
 * this to a paying member leaves them billed for something they can no longer
 * open, which is the more expensive half of the mistake `purchase-deactivate`
 * documents from the other direction.
 *
 * Idempotent: revoking an offer the contact does not hold converges.
 */
interface Input {
  contactId: string;
  offerIds: string;
}

const contactOfferRevoke: ActionDefinition<Input> = {
  key: "contact-offer-revoke",
  type: "perform",
  resource: "contact-offer",
  title: "Revoke Offers from Contact",
  description:
    "Remove a contact's access to one or more offers. Does not cancel any subscription paying " +
    "for them — use `purchase-cancel-subscription` for that.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "`contact-list` returns the ids.",
    },
    idListParam(
      "offerIds",
      "Offer IDs",
      "Comma-separated offer ids to revoke. `contact-offer-list` returns what the contact holds.",
    ),
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    const data = identifierList(input.offerIds, "offers");
    if (!data) throw new Error("Offer IDs: supply at least one offer id");
    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/offers`,
      { method: "DELETE", body: { data } },
    );
  },
};

export default contactOfferRevoke;
