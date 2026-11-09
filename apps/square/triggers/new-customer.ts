import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerGetMany from "../actions/customer-get-many.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "Polls the newest Square customers from customer-get-many.",
  action: customerGetMany,
  input: (params) => ({ ...params, sortField: "CREATED_AT", sortOrder: "DESC", limit: 100 }),
  items: (result) => (result as { customers?: unknown[] }).customers ?? [],
  idOf: (item) => String((item as { id: string }).id),
  params: customerGetMany.params,
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "customer_123", given_name: "Ada" },
  maxPages: 1,
});
