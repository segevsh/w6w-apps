import { pollFromListAction } from "../../_shared/poll/mod.ts";
import logList from "../actions/log-list.ts";

export default pollFromListAction({
  key: "new-log",
  title: "New Tenant Log",
  description: "The run gets each new Auth0 tenant log entry.",
  action: logList,
  input: () => ({ query: "", sort: "date:-1", take: 100 }),
  items: (result) => (result as { logs?: unknown[] }).logs ?? [],
  idOf: (item) => String((item as { log_id?: unknown }).log_id ?? ""),
  output: [{ key: "log_id", type: "string", label: "Log ID" }],
  sample: { log_id: "900202611090000000000000000000001" },
  maxPages: 1,
});
