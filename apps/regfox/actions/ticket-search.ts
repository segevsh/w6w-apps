import { searchAction } from "../lib/factory.ts";
import { intParam, statusFilter, strParam } from "../lib/params.ts";

/** `GET /v2/public/search/tickets` */
export default searchAction({
  key: "ticket-search",
  segment: "tickets",
  noun: "ticket",
  plural: "Tickets",
  extraParams: [
    intParam("formId", "Form ID"),
    statusFilter(
      "pending, abandoned, completed, canceled, pending offline payment, pending final payment",
    ),
    strParam("displayId", "Ticket display ID"),
    intParam("orderId", "Order ID"),
    strParam("orderDisplayId", "Order display ID"),
    intParam("orderCustomerId", "Order customer ID"),
    intParam("customerId", "Customer ID"),
    strParam("orderEmail", "Order email"),
    strParam("orderNumber", "Order number"),
  ],
});
