import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created new order.",
  action,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Order ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
