import action from "../actions/list-supplier-invoices.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-supplier-invoice",
  title: "New Supplier Invoice",
  description: "The run gets each newly created Pennylane supplier invoice, newest first.",
  action,
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "date", type: "string", label: "Invoice date" },
    { key: "payment_status", type: "string", label: "Payment status" },
  ],
  sample: {
    id: 771,
    invoice_number: "FA-2026-0771",
    date: "2026-11-09",
    payment_status: "to_be_paid",
  },
});
