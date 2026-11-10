import productList from "../actions/product-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-product",
  title: "New Product",
  action: productList,
  output: [{ key: "id", type: "number", label: "Product ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
