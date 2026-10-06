import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "company-get",
  resource: "company",
  path: "/companies",
  idKey: "companyId",
  idLabel: "Company ID",
  title: "Get Company",
  description: "Fetch one company by id.",
});
