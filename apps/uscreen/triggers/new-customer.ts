import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

/** The Publisher API documents the customer feed as newest-first by created_at. */
export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created Uscreen customer.",
  action: customerList,
  input: () => ({ dateField: "created_at", page: 1 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 101, email: "customer@example.test" },
  maxPages: 1,
});
