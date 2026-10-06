import { searchAction } from "../lib/factory.ts";
import { intParam, statusFilter, strParam, tsParam } from "../lib/params.ts";

/** `GET /v2/public/search/registrants` */
export default searchAction({
  key: "registrant-search",
  segment: "registrants",
  noun: "registrant",
  plural: "Registrants",
  extraParams: [
    intParam("formId", "Form ID"),
    statusFilter(
      "pending, abandoned, completed, transferred, pending transfer, canceled, waitlisted, ...",
    ),
    strParam("displayId", "Registrant display ID"),
    intParam("orderId", "Order ID"),
    strParam("orderDisplayId", "Order display ID"),
    intParam("orderCustomerId", "Order customer ID"),
    intParam("customerId", "Customer ID"),
    strParam("orderEmail", "Order email"),
    strParam("orderBillingLastName", "Order billing last name"),
    strParam("orderNumber", "Order number"),
    tsParam("dateCheckedInAfter", "Checked in after"),
    tsParam("dateCheckedInBefore", "Checked in before"),
  ],
});
