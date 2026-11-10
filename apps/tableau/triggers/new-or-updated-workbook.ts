import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/workbook-list.ts";

// Tableau: sort fields are the filter fields, which for Workbooks include `updatedAt`; direction
// `desc` is required (https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm,
// verified 2026-11-09). `sort=updatedAt:desc` is most recently changed first.
export default pollFromListAction<Record<string, never>>({
  key: "new-or-updated-workbook",
  title: "New or Updated Workbook",
  description: "The run gets each workbook that is newly published or was just updated.",
  action: action as unknown as ActionDefinition,
  input: () => ({ sort: "updatedAt:desc", limit: 100 }),
  items: (result) => (result as { workbooks?: unknown[] }).workbooks ?? [],
  idOf: (item) => {
    const w = item as { id?: unknown; updatedAt?: unknown };
    return `${w.id ?? ""}:${w.updatedAt ?? ""}`;
  },
  output: [
    { key: "id", type: "string", label: "Workbook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contentUrl", type: "string", label: "Content URL" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "wb-101",
    name: "Sales",
    contentUrl: "Sales",
    createdAt: "2026-11-09T00:00:00Z",
    updatedAt: "2026-11-10T00:00:00Z",
  },
  maxPages: 1,
});
