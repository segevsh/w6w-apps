import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { relationshipOutput } from "../lib/params.ts";

/**
 * `GET /v1/offers/{offer_id}/relationships/products` — what an offer unlocks.
 *
 * Answers the question a grant workflow actually needs: *if I give someone this
 * offer, what do they get?* One offer can carry several products, which is why
 * this is a to-many relationship rather than a field on the offer.
 *
 * Returns identifiers only — `product-list` or `product-get` resolves the
 * titles, or `offer-get` with `include=products` gets both in one request.
 *
 * Read-only: the document declares only `GET` on this path. Offers' product
 * composition is configured in Kajabi, not through the API.
 */
interface Input {
  offerId: string;
}

const offerProductList: ActionDefinition<Input> = {
  key: "offer-product-list",
  type: "read",
  resource: "offer",
  title: "List Offer's Products",
  description:
    "List the product ids an offer grants access to. Returns identifiers only — use `offer-get` " +
    "with `include=products` if you want the titles in the same call.",
  params: [
    {
      key: "offerId",
      label: "Offer ID",
      type: "string",
      required: true,
      hint: "`offer-list` returns the ids.",
    },
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/offers/${encodeURIComponent(input.offerId)}/relationships/products`,
    );
  },
};

export default offerProductList;
