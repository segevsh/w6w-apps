import { pollFromListAction } from "../../_shared/poll/mod.ts";
import productList from "../actions/product-list.ts";

export default pollFromListAction({
  key: "new-product",
  title: "New Product",
  description: "The run gets each new product.",
  action: productList,
  input: () => ({ maxResults: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Product ID" }],
  sample: { id: 1234567, name: "Course" },
  maxPages: 1,
});
