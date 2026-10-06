import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "product-list",
  resource: "product",
  title: "List Products",
  description: "List the account's products.",
  path: "/products",
  itemsLabel: "Products",
});
