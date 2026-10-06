import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "product-list",
  resource: "product",
  title: "List Products",
  description: "List products, with filter and sort.",
  path: "/products",
});
