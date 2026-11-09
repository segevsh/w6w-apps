import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/lead-list.ts";

export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each newly created lead.",
  action,
  input: () => ({ sort: "createdDate", order: "desc", page: 0, pageSize: 100 }),
  items: (result) => (result as { leads?: unknown[] }).leads ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Lead ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
