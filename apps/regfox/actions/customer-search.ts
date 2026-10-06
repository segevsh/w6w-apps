import { searchAction } from "../lib/factory.ts";
import { strParam } from "../lib/params.ts";

/** `GET /v2/public/search/customers` */
export default searchAction({
  key: "customer-search",
  segment: "customers",
  noun: "customer",
  plural: "Customers",
  extraParams: [
    strParam("email", "Billing email"),
  ],
});
