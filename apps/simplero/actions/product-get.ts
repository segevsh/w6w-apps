import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "product-get",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by its numeric id.",
  path: "/products",
  idLabel: "Product ID",
  outputLabel: "Product",
});
