import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listRows from "../actions/list-rows.ts";

export default pollFromListAction({
  key: "new-row",
  title: "New Row",
  description: "The run gets each newly created row.",
  action: listRows as never,
  params: listRows.params,
  input: (params) => ({
    docId: String(params.docId ?? ""),
    tableId: String(params.tableId ?? ""),
    sortBy: "createdAt",
    limit: 100,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Row ID" }],
  sample: { id: "i-row" },
  maxPages: 1,
});
