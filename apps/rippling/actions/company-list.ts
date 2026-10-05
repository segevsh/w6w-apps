import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "company-list",
  resource: "company",
  title: "List Companies",
  description:
    "The company (or companies) the token can see. Rippling's own quickstart uses this as the first call. Returns one page, forward-paginated.",
  path: "/companies/",
  scope: "companies.read",
  expandable: ["parent_legal_entity", "legal_entities"],
});
