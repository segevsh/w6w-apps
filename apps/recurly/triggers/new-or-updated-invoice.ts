import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-invoices.ts";

export default pollFromListAction({
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description: "The run gets each invoice that is new or was updated since the last check.",
  action,
  input: () => ({ limit: 100, sort: "updated_at", order: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => `${(item as { id?: string }).id}:${(item as { updated_at?: string }).updated_at}`,
  output: [{ key: "id", type: "string", label: "Invoice ID" }, {
    key: "updated_at",
    type: "string",
    label: "Updated at",
  }],
  sample: { id: "invoice-1", number: "1001", updated_at: "2026-11-09T10:00:00Z" },
  maxPages: 1,
});
