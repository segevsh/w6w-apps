import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "customer-group-list",
  resource: "customer-group",
  title: "List Customer Groups",
  description: "List customer groups; a customer's group number is required to create one.",
  path: "/customer-groups",
});
