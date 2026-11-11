import offerCodeList from "../actions/offer-code-list.ts";
import { newRecordSnapshot, productIdParam } from "../lib/triggers.ts";

/**
 * `GET /v2/products/:product_id/offer_codes` "Retrieve all of the existing offer codes for a
 * product" returns every code with no paging parameters (https://gumroad.com/api, verified
 * 2026-11-10), so one product's codes are a bounded collection.
 */
export default newRecordSnapshot<{ productId: string }>({
  key: "new-offer-code",
  title: "New Offer Code",
  description: "The run gets each offer code that is added to the chosen Gumroad product.",
  action: offerCodeList,
  params: [productIdParam],
  input: ({ productId }) => ({ productId }),
  rows: (result) => (result as { offerCodes?: unknown[] }).offerCodes ?? [],
  output: [
    { key: "id", type: "string", label: "Offer code ID" },
    { key: "name", type: "string", label: "Code" },
    { key: "percent_off", type: "number", label: "Percent off" },
    { key: "amount_cents", type: "number", label: "Amount off (cents)" },
    { key: "universal", type: "boolean", label: "Applies to all products" },
  ],
  sample: {
    id: "mN7CdHiwHaR9FlxKvF-n-g==",
    name: "HALFOFF",
    percent_off: 50,
    max_purchase_count: null,
    universal: false,
    times_used: 0,
  },
});
