import offerList from "../actions/offer-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /offers` (page only plus an unnamed `from`/`to` range): the store's offers (plans, rentals,
 * purchases) are a small catalogue, so each check reads every page and emits ids not seen before
 * (https://uscreen.io/api/publisher.yml, verified 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-offer",
  title: "New Offer",
  description: "The run gets each offer (plan, rental or purchase) newly added to the store.",
  action: offerList as never,
  paged: true,
  output: [
    { key: "id", type: "number", label: "Offer ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Offer type" },
    { key: "price_cents", type: "number", label: "Price (cents)" },
  ],
  sample: { id: 11, title: "Monthly plan", type: "recurring", price_cents: 999 },
});
