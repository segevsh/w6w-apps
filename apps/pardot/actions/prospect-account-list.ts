import { idFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "prospect-account-list",
  title: "List Prospect Accounts",
  description:
    "Query prospect accounts — the company-level record prospects roll up to. Read-only through the API.",
  path: "prospect-accounts",
  resource: "prospect-account",
  defaultFields: "id,name,salesforceId,industry,website,assignedToId,updatedAt",
  orderBy: ["id", "salesforceId"],
  filters: idFilters,
});
