import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listEntries from "../actions/list-entries.ts";

export default pollFromListAction<Record<string, unknown>>({
  key: "new-entry",
  title: "New Entry",
  description: "Emit entries newly created in Contentful.",
  action: listEntries,
  params: listEntries.params,
  input: (params) => ({ ...params, order: "-sys.createdAt", limit: 100, skip: 0 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { sys: { id: unknown } }).sys.id),
  output: [{ key: "sys", type: "object", label: "System metadata" }],
  sample: { sys: { id: "entry-1" } },
});
