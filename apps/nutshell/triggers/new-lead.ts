import { pollFromListAction } from "../../_shared/poll/mod.ts";
import findLeads from "../actions/find-leads.ts";

export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each newly created lead.",
  action: findLeads,
  input: () => ({ orderBy: "id", orderDirection: "DESC", limit: 100, page: 1, fullRecords: true }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Lead ID" }],
  sample: { id: 1001 },
  maxPages: 1,
});
