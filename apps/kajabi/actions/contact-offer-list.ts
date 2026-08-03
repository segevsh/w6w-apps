import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { relationshipOutput } from "../lib/params.ts";

/**
 * `GET /v1/contacts/{contact_id}/relationships/offers` — what a contact has access to.
 *
 * Returns resource identifiers only (`{ data: [{ id, type }] }`), like every
 * JSON:API relationship route here — resolve titles with `offer-list`.
 *
 * This is the read that should precede any `contact-offer-revoke`: it is the
 * only way to know what a contact currently holds before taking something away.
 */
interface Input {
  contactId: string;
}

const contactOfferList: ActionDefinition<Input> = {
  key: "contact-offer-list",
  type: "read",
  resource: "contact-offer",
  title: "List Contact's Offers",
  description:
    "List the offer ids a contact has been granted. Returns identifiers only — `offer-list` " +
    "resolves the titles.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "`contact-list` returns the ids.",
    },
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/offers`,
    );
  },
};

export default contactOfferList;
