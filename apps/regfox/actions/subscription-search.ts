import { searchAction } from "../lib/factory.ts";
import { intParam, statusFilter, strParam } from "../lib/params.ts";

/** `GET /v2/public/search/subscriptions` */
export default searchAction({
  key: "subscription-search",
  segment: "subscriptions",
  noun: "subscription",
  plural: "Subscriptions",
  extraParams: [
    intParam("formId", "Form ID"),
    statusFilter("active, inactive, canceled, completed"),
    strParam("displayId", "Subscription display ID"),
    intParam("orderId", "Order ID"),
    strParam("orderDisplayId", "Order display ID"),
    intParam("customerId", "Customer ID"),
    strParam("orderEmail", "Order email"),
    strParam("orderNumber", "Order number"),
  ],
});
