import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created new customer.",
  action,
  input: () => ({ sort: "-createdAt", page: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Customer ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
