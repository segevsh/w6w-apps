import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listDeals from "../actions/list-deals.ts";

export default pollFromListAction({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each newly created Outseta CRM deal (newest first).",
  action: listDeals,
  input: () => ({ limit: 25, orderBy: "Created DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { Uid?: unknown }).Uid ?? ""),
  output: [
    { key: "Uid", type: "string", label: "Deal Uid" },
    { key: "Name", type: "string", label: "Name" },
    { key: "Amount", type: "number", label: "Amount" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: {
    Uid: "n9Rk2LpQ",
    Name: "Annual plan",
    Amount: 1200,
    Created: "2026-11-09T09:00:00Z",
  },
  maxPages: 1,
});
