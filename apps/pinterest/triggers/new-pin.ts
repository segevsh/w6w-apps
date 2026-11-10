import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/pin-list.ts";

export default pollFromListAction({
  key: "new-pin",
  title: "New Pin",
  description: "The run gets each newly created pin.",
  action,
  input: () => ({ pageSize: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Pin ID" }],
  sample: { id: "pin-2" },
  maxPages: 1,
});
