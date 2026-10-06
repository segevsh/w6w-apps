import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "customer-get",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by its customer number.",
  path: "/customers",
  idKey: "customerNumber",
  idLabel: "Customer number",
  idType: "number",
  outputKey: "customer",
});
