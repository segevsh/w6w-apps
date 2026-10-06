import { searchAction } from "../lib/factory.ts";
import { intParam, statusFilter, strParam } from "../lib/params.ts";

/** `GET /v2/public/search/orders` */
export default searchAction({
  key: "order-search",
  segment: "orders",
  noun: "order",
  plural: "Orders",
  extraParams: [
    intParam("formId", "Form ID"),
    statusFilter(
      "pending, abandoned, completed, canceled, pending offline payment, pending final payment, waitlisted",
    ),
    intParam("customerId", "Customer ID"),
    strParam("orderEmail", "Order email"),
    strParam("orderNumber", "Order number"),
  ],
});
