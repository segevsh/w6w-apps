import { searchAction } from "../lib/params.ts";

export default searchAction({
  key: "company-search",
  resource: "company",
  title: "Search Companies",
  description: "Find companies by name (`GET /v1/companies/search`).",
  path: "/companies",
  filters: [{ key: "companyName", api: "company_name", label: "Company name" }],
});
