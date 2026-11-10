import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerGetMany from "../actions/customer-get-many.ts";

export default pollFromListAction({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "The run gets each newly created or updated customer.",
  action: customerGetMany,
  input: () => ({ orderBy: "updated_datetime:desc", limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const customer = item as { id?: unknown; updated_datetime?: unknown };
    return `${String(customer.id ?? "")}:${String(customer.updated_datetime ?? "")}`;
  },
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 1, updated_datetime: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
