import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

const trigger = pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created Booqable customer.",
  action,
  input: (params) => ({ ...params, sort: "-created_at", pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: string }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "customer_1", name: "New customer" },
  maxPages: 1,
});

export default trigger;
