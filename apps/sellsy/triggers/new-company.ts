import { pollFromListAction } from "../../_shared/poll/mod.ts";
import companySearch from "../actions/company-search.ts";

export default pollFromListAction({
  key: "new-company",
  title: "New Company",
  description: "Runs when Sellsy creates a company.",
  action: companySearch,
  input: () => ({ limit: 100, order: "created_at", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Company ID" }],
  sample: { id: 101, name: "Acme" },
  maxPages: 1,
});
