import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listCustomers from "../actions/list-customers.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  action: listCustomers,
  input: () => ({ limit: 100, sortField: "created_at", sortDirection: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "CU000001" },
  maxPages: 1,
});
