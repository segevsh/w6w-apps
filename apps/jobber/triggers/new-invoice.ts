import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created new invoice.",
  action,
  input: () => ({ sortKey: "CREATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { invoices?: { nodes?: unknown[] } }).invoices?.nodes ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Invoice ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
