import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerGetMany from "../actions/customer-get-many.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  action: customerGetMany,
  input: () => ({ orderBy: "created_datetime:desc", limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
