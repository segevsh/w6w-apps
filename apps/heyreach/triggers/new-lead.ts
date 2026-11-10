import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listGetLeads from "../actions/list-get-leads.ts";

export default pollFromListAction<{ listId: number }>({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each new lead added to the selected list.",
  action: listGetLeads as never,
  input: (params: { listId: number }) => ({ listId: params.listId, limit: 100, offset: 0 }),
  params: [{ key: "listId", label: "List ID", type: "number", required: true }],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; leadId?: unknown }).id ?? (item as { leadId?: unknown }).leadId ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "Lead ID" }],
  sample: { id: "lead-1", firstName: "Ada" },
  maxPages: 1,
});
