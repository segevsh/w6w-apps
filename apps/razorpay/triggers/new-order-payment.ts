import { boundedList } from "../lib/triggers.ts";
import orderPaymentsList from "../actions/order-payments-list.ts";

export default boundedList({
  key: "new-order-payment",
  title: "New Order Payment Attempt",
  description: "The run gets each payment attempt newly made against one order.",
  action: orderPaymentsList as never,
  params: [{
    key: "orderId",
    label: "Order ID",
    type: "string",
    required: true,
    hint: "The order whose payment attempts to watch (order_*).",
  }],
  input: (p) => ({ id: String(p.orderId).trim() }),
  paged: false,
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "order_id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "pay_1", order_id: "order_1", status: "failed", created_at: 1700000000 },
});
