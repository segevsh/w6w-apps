import { sinceFeed } from "../lib/triggers.ts";
import invoiceList from "../actions/invoice-list.ts";

export default sinceFeed({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each invoice or payment-link invoice newly created on the account.",
  action: invoiceList as never,
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "inv_1", status: "issued", amount: 50000, created_at: 1700000000 },
});
