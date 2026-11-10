import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description:
    "The run gets each newly created order, oldest first, polled from the existing `order-list` action sorted in the vendor's documented default order (`created_at` descending).",
  action,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Order ID" },
    {
      key: "attributes",
      type: "object",
      label: "Order attributes (order_number, total, user_email, created_at)",
    },
  ],
  sample: {
    id: "1",
    type: "orders",
    attributes: {
      order_number: 1,
      total: 1199,
      user_email: "ada@example.com",
      created_at: "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
