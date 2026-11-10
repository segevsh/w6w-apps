import { pollFromListAction } from "../../_shared/poll/mod.ts";
import savedSearchList from "../actions/saved-search-list.ts";

/**
 * `GET /saved-searches` is documented "newest first"
 * (https://docs.seamless.ai/api-reference/v2/saved-searches/list-saved-searches) and returns the
 * user's whole set in one response, so page one is the newest-first shape.
 */
export default pollFromListAction({
  key: "new-saved-search",
  title: "New Saved Search",
  description: "The run gets each saved search created since the last check.",
  action: savedSearchList,
  input: (params) => ({ ...params }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { savedSearchId: string | number }).savedSearchId),
  params: savedSearchList.params,
  output: [
    { key: "savedSearchId", type: "string", label: "Saved search ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type (contacts or companies)" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    savedSearchId: "501",
    name: "VPs of Sales",
    type: "contacts",
    createdAt: "2026-11-10T09:00:00.000Z",
  },
  maxPages: 1,
});
