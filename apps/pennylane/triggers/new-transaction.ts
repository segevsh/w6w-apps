import action from "../actions/list-transactions.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-transaction",
  title: "New Bank Transaction",
  description: "The run gets each newly imported Pennylane bank transaction, newest first.",
  action,
  output: [
    { key: "id", type: "number", label: "Transaction ID" },
    { key: "label", type: "string", label: "Label" },
    { key: "date", type: "string", label: "Date" },
    { key: "amount", type: "string", label: "Amount" },
  ],
  sample: { id: 9012, label: "VIR SEPA Dupont", date: "2026-11-09", amount: "120.00" },
});
