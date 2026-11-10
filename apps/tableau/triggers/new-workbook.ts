import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/workbook-list.ts";

// Tableau: "You can sort on the same fields that you use to filter. The direction value is asc
// (ascending) or desc (descending), and is required." and Workbooks filter on `createdAt`
// (https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm,
// verified 2026-11-09). So `sort=createdAt:desc` is newest first.
export default pollFromListAction<Record<string, never>>({
  key: "new-workbook",
  title: "New Workbook",
  description: "The run gets each workbook newly published to the site.",
  action: action as unknown as ActionDefinition,
  input: () => ({ sort: "createdAt:desc", limit: 100 }),
  items: (result) => (result as { workbooks?: unknown[] }).workbooks ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
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
    updatedAt: "2026-11-09T00:00:00Z",
  },
  maxPages: 1,
});
