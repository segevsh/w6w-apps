import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "customer-list",
  resource: "customer",
  title: "List Customers",
  description: "List customers, with e-conomic filter and sort expressions.",
  path: "/customers",
});
