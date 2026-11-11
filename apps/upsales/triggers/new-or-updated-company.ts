import companyList from "../actions/company-list.ts";
import { updatedListTrigger } from "../lib/list-trigger.ts";
export default updatedListTrigger({
  key: "new-or-updated-company",
  title: "New or Updated Company",
  noun: "company",
  action: companyList,
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "modDate", type: "string", label: "Modified at" },
  ],
  sample: { id: 1, modDate: "2026-11-10T00:00:00Z" },
});
