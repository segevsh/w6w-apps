import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/bulk-operation-list.ts";

// sort_order=desc, as new-order (https://docs.loopreturns.com/openapi/bulk-operations-api.yaml).
export default pollFromListAction({
  key: "new-bulk-operation",
  title: "New Bulk Operation",
  description: "The run gets each bulk operation (file import) newly created in Loop.",
  action,
  input: () => ({ limit: 100, sortOrder: "desc" }),
  items: (result) => (result as { bulk_operations?: unknown[] }).bulk_operations ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Bulk operation ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: 641174584320376089, status: "pending", pending_count: 1, failed_count: 0 },
  maxPages: 1,
});
