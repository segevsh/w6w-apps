import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/customers/{id}?product=` */
export default getAction({
  key: "customer-get",
  segment: "customers",
  noun: "customer",
  idKey: "customerId",
  idLabel: "Customer ID",
});
