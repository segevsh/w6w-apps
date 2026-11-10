import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

interface Invoice {
  id?: string;
  updatedDate?: string;
}

export default pollFromListAction({
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description:
    "The run gets each invoice that is created or changed (posted, adjusted, paid), most recently updated first.",
  action,
  input: () => ({ sort: "updateddate.DESC", limit: 50, maxPages: 1 }),
  items: (result) => (result as { invoices?: unknown[] }).invoices ?? [],
  idOf: (item) => {
    const i = item as Invoice;
    return `${i.id ?? ""}:${i.updatedDate ?? ""}`;
  },
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "invoiceNumber", type: "string", label: "Invoice number" },
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "invoiceDate", type: "string", label: "Invoice date" },
    { key: "updatedDate", type: "string", label: "Updated date" },
  ],
  sample: {
    id: "8ad09b7d8c1f2a3b018c1f4e5d6a0001",
    invoiceNumber: "INV00000123",
    accountId: "8ad09b7d8c1f2a3b018c1f4e5d6a0002",
    status: "Posted",
    amount: 120.5,
    invoiceDate: "2026-11-09",
    updatedDate: "2026-11-09T12:00:00.000+00:00",
  },
});
