import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "product-group-list",
  resource: "product-group",
  title: "List Product Groups",
  description: "List product groups; a product's group number is required to create one.",
  path: "/product-groups",
});
