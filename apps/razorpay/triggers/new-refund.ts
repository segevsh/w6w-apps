import { sinceFeed } from "../lib/triggers.ts";
import refundList from "../actions/refund-list.ts";

export default sinceFeed({
  key: "new-refund",
  title: "New Refund",
  description: "The run gets each refund newly created on the account.",
  action: refundList as never,
  output: [
    { key: "id", type: "string", label: "Refund ID" },
    { key: "payment_id", type: "string", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "rfnd_1", payment_id: "pay_1", amount: 5000, created_at: 1700000000 },
});
