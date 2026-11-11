import type { ActionDefinition } from "@w6w/types";
import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import opportunityList from "../actions/opportunity-list.ts";

/**
 * Every opportunity in the database.
 * Redtail documents no sort order and no created-since filter on this list (TWAPI Documentation,
 * https://documenter.getpostman.com/view/7873823/SVzxXyzn), so each check reads every page
 * (`meta.total_pages`, at most 20) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-opportunity",
  title: "New Opportunity",
  description: "The run gets each sales opportunity newly created in the database.",
  action: opportunityList as unknown as ActionDefinition,
  maxPages: 20,
  items: (result) => (result as { opportunities?: unknown[] }).opportunities ?? [],
  output: [
    { key: "id", type: "number", label: "Opportunity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "amount", type: "string", label: "Amount" },
  ],
  sample: { id: 643, name: "401k rollover", stage: "Prospect", amount: "25000.0" },
});
