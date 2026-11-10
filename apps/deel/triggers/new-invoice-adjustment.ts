import { snapshotList } from "../lib/snapshot.ts";
import invoiceAdjustmentList from "../actions/invoice-adjustment-list.ts";

export default snapshotList<{ statuses?: string }>({
  key: "new-invoice-adjustment",
  title: "New Invoice Adjustment",
  description:
    "The run gets each invoice adjustment (bonus, expense or deduction) that newly appears with one of the watched statuses (default pending).",
  params: [{
    key: "statuses",
    label: "Statuses",
    type: "string",
    default: "pending",
    hint:
      "Comma-separated statuses to watch (blank = every status, which can exceed the 5000-row cap).",
  }],
  action: invoiceAdjustmentList,
  input: (p) => ({ statuses: p.statuses ?? "pending" }),
  output: [
    { key: "id", type: "string", label: "Adjustment ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "a1", status: "pending" },
});
