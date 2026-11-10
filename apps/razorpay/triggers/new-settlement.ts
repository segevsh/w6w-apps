import { sinceFeed } from "../lib/triggers.ts";
import settlementList from "../actions/settlement-list.ts";

export default sinceFeed({
  key: "new-settlement",
  title: "New Settlement",
  description: "The run gets each settlement newly created on the account.",
  action: settlementList as never,
  output: [
    { key: "id", type: "string", label: "Settlement ID" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "setl_1", amount: 450000, status: "processed", created_at: 1700000000 },
});
