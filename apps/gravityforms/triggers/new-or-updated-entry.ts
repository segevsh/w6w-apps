import { pollFromListAction } from "../../_shared/poll/mod.ts";
import entryGetMany from "../actions/entry-get-many.ts";

export default pollFromListAction({
  key: "new-or-updated-entry",
  title: "New or Updated Entry",
  description: "The run gets each newly created or updated form entry.",
  action: entryGetMany,
  input: () => ({ sortingKey: "date_updated", sortingDirection: "DESC", pageSize: 100 }),
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: (item) => {
    const entry = item as { id?: unknown; date_updated?: unknown };
    return `${String(entry.id ?? "")}:${String(entry.date_updated ?? "")}`;
  },
  output: [{ key: "id", type: "number", label: "Entry ID" }],
  sample: { id: 1, date_updated: "2026-11-09 00:00:00" },
  maxPages: 1,
});
