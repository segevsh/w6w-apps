import { pollFromListAction } from "../../_shared/poll/mod.ts";
import leadsList from "../actions/leads-list.ts";

export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each newly captured lead.",
  action: leadsList,
  input: () => ({ leadsPerPage: 100, pageNumber: 1, order: "desc" }),
  items: (r) => (r as { leads?: unknown[] }).leads ?? [],
  idOf: (i) =>
    String(
      (i as { id?: unknown; lead_id?: unknown }).id ?? (i as { lead_id?: unknown }).lead_id ?? "",
    ),
  output: [{ key: "id", type: "string", label: "Lead ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
