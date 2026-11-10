import { pollFromListAction } from "../../_shared/poll/mod.ts";
import entryGetMany from "../actions/entry-get-many.ts";

export default pollFromListAction({
  key: "new-entry",
  title: "New Entry",
  description: "The run gets each newly submitted form entry.",
  action: entryGetMany,
  input: () => ({ sortingKey: "date_created", sortingDirection: "DESC", pageSize: 100 }),
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Entry ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
