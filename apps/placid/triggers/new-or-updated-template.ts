import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/template-list.ts";

export default pollFromListAction({
  key: "new-or-updated-template",
  title: "New or Updated Template",
  description: "The run gets each newly created or updated template.",
  action,
  input: () => ({ order_by: "updated_at-desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const row = item as { id?: unknown; updated_at?: unknown };
    return `${String(row.id ?? "")}:${String(row.updated_at ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Template ID" }],
  sample: { id: "template-2", updated_at: "2026-01-02T00:00:00Z" },
  maxPages: 1,
});
