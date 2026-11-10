import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import querySites from "../actions/query-sites.ts";

// Wix Query Sites: `createdDate` is sortable ASC/DESC (https://dev.wix.com/docs/api-reference/account-level/sites/sites/query-sites, verified 2026-11-10). Newest-first, brief 9.1 a. Account-level: needs the connection's Account ID.
export default pollFromListAction<Record<string, never>>({
  key: "new-site",
  title: "New Site",
  description: "The run gets each newly created site in the Wix account.",
  action: querySites as unknown as ActionDefinition,
  input: () => ({ sortFieldName: "createdDate", sortOrder: "DESC", limit: 50 }),
  items: (result) => (result as { sites?: unknown[] }).sites ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [],
  output: [
    { key: "id", type: "string", label: "Site ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "createdDate", type: "string", label: "Created at" },
    { key: "updatedDate", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "sample-site-id",
    displayName: "My Site",
    createdDate: "2026-11-09T10:00:00.000Z",
    updatedDate: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
