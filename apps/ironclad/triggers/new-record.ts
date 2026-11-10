import { pollFromListAction } from "../../_shared/poll/mod.ts";
import recordList from "../actions/record-list.ts";

export default pollFromListAction({
  key: "new-record",
  title: "New Record",
  description: "The run gets each new contract record.",
  action: recordList,
  input: () => ({ page: 0, pageSize: 100, sortField: "agreementDate", sortDirection: "DESC" }),
  items: (result) => (result as { list?: unknown[] }).list ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Record ID" }],
  sample: { id: "record-1", name: "NDA" },
  maxPages: 1,
});
