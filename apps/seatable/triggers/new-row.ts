import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import rowList from "../actions/row-list.ts";

interface Input {
  tableName: string;
  viewName: string;
}

const newRow = pollFromListAction<Input>({
  key: "new-row",
  title: "New Row",
  description:
    "Poll a SeaTable view ordered by _ctime descending and emit rows not seen in the last checks.",
  action: rowList as unknown as ActionDefinition,
  input: (params) => ({ tableName: params.tableName, viewName: params.viewName, limit: 100 }),
  items: (result) => (result as { rows?: unknown[] }).rows ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  params: [
    { key: "tableName", label: "Table", type: "string", required: true },
    {
      key: "viewName",
      label: "Newest-first view",
      type: "string",
      required: true,
      hint: "Create a view sorted by the _ctime system column, descending, then enter its name.",
    },
  ],
  output: [{ key: "row", type: "object", label: "New row" }],
  sample: { _id: "r1", _ctime: "2026-11-09T12:00:00Z", Name: "Ada" },
});

export default newRow;
