import { snapshotTrigger } from "../lib/snapshot.ts";
import companyList from "../actions/company-list.ts";

/**
 * `GET /api/v2/companies` (https://axonaut.com/api/v2/doc, 2026-11-10) sorts by `id`, `name` or `address_city` with no
 * direction and has no date filter, and pages by a `page` header with no total, so no newest-first read exists:
 * each check reads every page (archived companies stay out, the vendor default) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-company",
  title: "New Company",
  description:
    "The run gets each company (customer, prospect or supplier) newly created in Axonaut.",
  action: companyList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "creation_date", type: "string", label: "Creation date" },
    { key: "is_customer", type: "boolean", label: "Customer" },
    { key: "is_prospect", type: "boolean", label: "Prospect" },
  ],
  sample: {
    id: 1042,
    name: "Example Co",
    creation_date: "2026-11-09",
    is_customer: false,
    is_prospect: true,
  },
});
