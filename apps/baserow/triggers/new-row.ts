import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import rowList from "../actions/row-list.ts";

export default pollFromListAction({
  key: "new-row",
  title: "New Row",
  description: "The run gets each newly added row in the selected Baserow table.",
  action: rowList as unknown as ActionDefinition,
  params: [{ key: "tableId", label: "Table ID", type: "number", required: true }],
  input: (params: { tableId: number }) => ({
    tableId: params.tableId,
    userFieldNames: false,
    orderBy: "-id",
    page: 1,
    size: 100,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Row ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
