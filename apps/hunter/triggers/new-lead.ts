import { pollFromListAction } from "../../_shared/poll/mod.ts";
import leadList from "../actions/lead-list.ts";

export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each new saved lead.",
  action: leadList,
  input: () => ({ limit: 100, offset: 0 }),
  items: (result) => ((result as { data?: { leads?: unknown[] } }).data?.leads ?? []),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Lead ID" }],
  sample: { id: 1, email: "ada@example.com" },
  maxPages: 1,
});
