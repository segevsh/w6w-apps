import companyList from "../actions/company-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap company, newest first (`GET /rest/v2/companies`, `order_by=create_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-company",
  title: "New Company",
  description:
    "The run gets each new Keap company, newest first (`GET /rest/v2/companies`, `order_by=create_time desc`).",
  action: companyList,
  list: "companies",
  orderBy: "create_time desc",
  output: [{ key: "id", type: "string", label: "ID" }, {
    key: "company_name",
    type: "string",
    label: "Company name",
  }, { key: "create_time", type: "string", label: "Created at" }],
  sample: { id: "1", company_name: "Example Co", create_time: "2026-11-10T12:00:00.000Z" },
});
