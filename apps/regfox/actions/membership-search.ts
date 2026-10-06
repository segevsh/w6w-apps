import { searchAction } from "../lib/factory.ts";
import { intParam, statusFilter, strParam } from "../lib/params.ts";

/** `GET /v2/public/search/memberships` */
export default searchAction({
  key: "membership-search",
  segment: "memberships",
  noun: "membership",
  plural: "Memberships",
  extraParams: [
    intParam("formId", "Form ID"),
    statusFilter("purchasing, active, inactive, expired, purchasing abandoned"),
    intParam("registrantId", "Registrant ID"),
    intParam("customerId", "Customer ID"),
    strParam("email", "Email"),
    strParam("levelId", "Membership level ID"),
  ],
});
