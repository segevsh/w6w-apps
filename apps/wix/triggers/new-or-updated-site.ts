import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import querySites from "../actions/query-sites.ts";

// Wix Query Sites: `updatedDate` is sortable ASC/DESC (https://dev.wix.com/docs/api-reference/account-level/sites/sites/query-sites, verified 2026-11-10). The id carries the update stamp, so an edit is a new event (brief 9.2).
export default pollFromListAction<Record<string, never>>({
  key: "new-or-updated-site",
  title: "New or Updated Site",
  description: "The run gets each site in the Wix account that is created or edited.",
  action: querySites as unknown as ActionDefinition,
  input: () => ({ sortFieldName: "updatedDate", sortOrder: "DESC", limit: 50 }),
  items: (result) => (result as { sites?: unknown[] }).sites ?? [],
  idOf: (item) => {
    const s = item as { id?: unknown; updatedDate?: unknown };
    return `${s.id ?? ""}:${s.updatedDate ?? ""}`;
  },
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
    updatedDate: "2026-11-10T10:00:00.000Z",
  },
  maxPages: 1,
});
