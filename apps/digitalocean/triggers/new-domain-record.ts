import { pollFromListAction } from "../../_shared/poll/mod.ts";
import domainRecordList from "../actions/domain-record-list.ts";

export default pollFromListAction({
  key: "new-domain-record",
  title: "New Domain Record",
  description: "The run gets each newly created DNS record.",
  action: domainRecordList,
  params: domainRecordList.params,
  input: (params) => ({ domain: String(params.domain ?? ""), perPage: 200 }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "DNS record ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
