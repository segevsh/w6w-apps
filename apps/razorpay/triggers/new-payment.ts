import { sinceFeed } from "../lib/triggers.ts";
import paymentList from "../actions/payment-list.ts";

export default sinceFeed({
  key: "new-payment",
  title: "New Payment",
  description: "The run gets each payment newly created on the account.",
  action: paymentList as never,
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: {
    id: "pay_1",
    amount: 50000,
    currency: "INR",
    status: "captured",
    created_at: 1700000000,
  },
});
