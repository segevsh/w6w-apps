import { getAction } from "../lib/factory.ts";

/** `GET /v1.0/customers/{customer_id}` */
export default getAction({
  key: "customer-get",
  title: "Get Customer",
  description: "Get one customer by id.",
  resource: "customer",
  path: "/customers/{id}",
  idKey: "customerId",
  idLabel: "Customer id",
});
