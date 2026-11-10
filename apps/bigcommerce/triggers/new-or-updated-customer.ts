import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "The run gets each customer when it is first seen or its modification time changes.",
  action: customerList,
  input: () => ({ sort: "date_modified:desc", limit: 100, page: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const customer = item as { id?: unknown; date_modified?: unknown };
    return `${String(customer.id ?? "")}:${String(customer.date_modified ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: { id: 42, email: "customer@example.com", date_modified: "2026-11-10T10:00:00+00:00" },
  maxPages: 1,
});
