import companyList from "../actions/company-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-company",
  title: "New Company",
  action: companyList,
  output: [{ key: "id", type: "number", label: "Company ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
