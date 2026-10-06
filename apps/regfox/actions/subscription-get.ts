import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/subscriptions/{id}?product=` */
export default getAction({
  key: "subscription-get",
  segment: "subscriptions",
  noun: "subscription",
  idKey: "subscriptionId",
  idLabel: "Subscription ID",
});
