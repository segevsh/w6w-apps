import { pollFromListAction } from "../../_shared/poll/mod.ts";
import checklistList from "../actions/checklist-list.ts";

export default pollFromListAction({
  key: "new-checklist",
  title: "New Checklist",
  description: "The run gets each newly created checklist.",
  action: checklistList,
  input: () => ({ page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Checklist ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
