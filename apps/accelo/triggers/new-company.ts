import { pollFromListAction } from "../../_shared/poll/mod.ts";
import companyList from "../actions/company-list.ts";

export default pollFromListAction({
  key: "new-company",
  title: "New Company",
  description: "The run gets each newly created company.",
  action: companyList,
  input: () => ({ orderBy: "id", orderDirection: "desc", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Company ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],
  sample: { id: "42", name: "Acme Ltd" },
  maxPages: 1,
});
