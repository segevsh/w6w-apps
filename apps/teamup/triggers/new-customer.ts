import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customersList from "../actions/customers-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "Poll customers through the existing customers-list action.",
  action: customersList,
  input: () => ({ page: 1, page_size: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
