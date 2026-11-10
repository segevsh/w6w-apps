import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/payout-list.ts";

// `sortField=depositDate&sortDirection=desc` lists the latest payouts first
// (https://docs.sayanchor.com/reference/listpayouts-1, verified 2026-11-10).
export default pollFromListAction({
  key: "new-payout",
  title: "New Payout",
  description: "The run gets each newly created payout (transfer to your bank account).",
  action,
  input: () => ({ page: 1, limit: 100, sortField: "depositDate", sortDirection: "desc" }),
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Payout ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "payout-101", status: "paid" },
  maxPages: 1,
});
