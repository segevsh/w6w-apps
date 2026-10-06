import { listAction } from "../lib/params.ts";

export default listAction({
  key: "company-list",
  resource: "company",
  title: "List Companies",
  description: "List companies, one page at a time (`GET /v1/companies`).",
  path: "/companies",
});
