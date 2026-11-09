import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-search.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly registered Ecwid customer.",
  action,
  input: (params) => ({ ...params, sortBy: "REGISTERED_DATE_DESC", limit: 100, offset: 0 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: action.params,
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 123, email: "customer@example.com", registered: "2026-11-09" },
  maxPages: 1,
});
