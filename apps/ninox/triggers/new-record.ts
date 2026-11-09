import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/record-list.ts";

interface Params {
  moduleName: string;
  tableName: string;
}

const trigger = pollFromListAction<Params>({
  key: "new-record",
  title: "New Record",
  description: "Fires for newly created table records.",
  action: action as never,
  params: [{ key: "moduleName", label: "Module", type: "string", required: true }, {
    key: "tableName",
    label: "Table",
    type: "string",
    required: true,
  }],
  input: ({ moduleName, tableName }) => ({
    moduleName,
    tableName,
    sort: "-_createdAt",
    limit: 100,
    offset: 0,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [{ key: "id", type: "string", label: "Record ID" }],
  sample: { id: "record-1", values: {} },
  maxPages: 1,
});

export default trigger;
