import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/call-list.ts";

export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly created call.",
  action,
  input: () => ({ order: "desc", page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Call ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
