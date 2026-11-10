import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/person-list.ts";

export default pollFromListAction({
  key: "new-person",
  title: "New Person",
  description: "The run gets each newly created person.",
  action,
  input: () => ({ sort: "-created_at", pageSize: 100, pageNumber: 1 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Person ID" }],
  sample: { id: "person-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
