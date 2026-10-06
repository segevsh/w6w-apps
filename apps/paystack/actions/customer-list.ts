import { dateRangeParams, listAction, paginationParams } from "../lib/factory.ts";

/** `GET /customer`. */
export default listAction({
  key: "customer-list",
  title: "List Customers",
  description: "List customers on the integration.",
  resource: "customer",
  path: "/customer",
  params: [...dateRangeParams, ...paginationParams],
});
