import action from "../actions/list-transactions.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-transaction",
  title: "New Account Transaction",
  description:
    "The run gets each new invoice, payment, credit, refund or chargeback transaction on the chosen Outseta account (newest first).",
  action,
  output: [
    { key: "Uid", type: "string", label: "Transaction Uid" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: { Uid: "tx5Wd1Jq", Created: "2026-11-10T09:00:00Z" },
});
