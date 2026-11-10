import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

// Same sort_order=desc convention as new-order; the sort key is not named in
// https://docs.loopreturns.com/openapi/customers-api.yaml (ids are Loop-assigned, ascending).
export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each customer newly created in Loop.",
  action,
  input: () => ({ limit: 100, sortOrder: "desc" }),
  items: (result) => (result as { customers?: unknown[] }).customers ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 67329889100573, email: "customer@example.com" },
  maxPages: 1,
});
