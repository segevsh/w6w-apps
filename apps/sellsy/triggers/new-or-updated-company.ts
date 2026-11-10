import { pollFromListAction } from "../../_shared/poll/mod.ts";
import companySearch from "../actions/company-search.ts";

export default pollFromListAction({
  key: "new-or-updated-company",
  title: "New or Updated Company",
  description: "Runs when Sellsy creates or updates a company.",
  action: companySearch,
  input: () => ({ limit: 100, order: "updated_at", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const company = item as { id?: unknown; updated_at?: unknown };
    return `${company.id ?? ""}:${company.updated_at ?? ""}`;
  },
  output: [{ key: "id", type: "number", label: "Company ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
