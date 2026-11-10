import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  action,
  input: () => ({ orderBy: "id[DESC]", perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "ctm-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
