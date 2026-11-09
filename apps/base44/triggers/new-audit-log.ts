import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAuditLogs from "../actions/list-audit-logs.ts";

export default pollFromListAction({
  key: "new-audit-log",
  title: "New Audit Log Event",
  description: "The run gets each newly recorded workspace audit-log event.",
  action: listAuditLogs,
  input: () => ({ limit: 1000, order: "DESC" }),
  items: (result) => (result as { events?: unknown[] }).events ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Audit log ID" }],
  sample: { id: "audit-new" },
  maxPages: 1,
});
