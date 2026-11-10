import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer in the store.",
  action: customerList,
  input: () => ({ sort: "date_created:desc", limit: 100, page: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "date_created", type: "string", label: "Created at" },
  ],
  sample: { id: 42, email: "customer@example.com", date_created: "2026-11-10T10:00:00+00:00" },
  maxPages: 1,
});
