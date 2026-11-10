import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-tables.ts";

export default pollFromListAction({
  key: "new-table",
  title: "New Table",
  description: "The run gets each newly created table.",
  action,
  input: () => ({ appId: "bqrtest" }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Table ID" }],
  sample: { id: "bq1", name: "Leads" },
  maxPages: 1,
});
