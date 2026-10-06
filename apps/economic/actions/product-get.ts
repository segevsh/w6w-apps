import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "product-get",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by its product number (a string).",
  path: "/products",
  idKey: "productNumber",
  idLabel: "Product number",
  idType: "string",
  outputKey: "product",
});
