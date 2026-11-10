import { pollFromListAction } from "../../_shared/poll/mod.ts";
import recordList from "../actions/record-list.ts";

export default pollFromListAction({
  key: "new-or-updated-record",
  title: "New or Updated Record",
  description: "The run gets each newly created or updated contract record.",
  action: recordList,
  input: () => ({ page: 0, pageSize: 100, sortField: "lastUpdated", sortDirection: "DESC" }),
  items: (result) => (result as { list?: unknown[] }).list ?? [],
  idOf: (item) => {
    const record = item as { id?: unknown; lastUpdated?: unknown };
    return `${String(record.id ?? "")}:${String(record.lastUpdated ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Record ID" }],
  sample: { id: "record-1", lastUpdated: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
