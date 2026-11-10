import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each new customer.",
  action: customerList,
  input: () => ({ sortBy: "created_at", sortDirection: "desc", page: 1, pageSize: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "customer-1", first_name: "Ada" },
  maxPages: 1,
});
