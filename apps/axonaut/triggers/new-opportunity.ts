import { snapshotTrigger } from "../lib/snapshot.ts";
import opportunityList from "../actions/opportunity-list.ts";

/**
 * `GET /api/v2/opportunities` (https://axonaut.com/api/v2/doc, 2026-11-10) is served unordered and unfiltered, one page per `page`
 * header with no total, so each check reads every page and diffs the ids against the previous check (added only).
 */
export default snapshotTrigger({
  key: "new-opportunity",
  title: "New Opportunity",
  description: "The run gets each sales opportunity newly created in Axonaut.",
  action: opportunityList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Opportunity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "pipe_name", type: "string", label: "Pipeline" },
    { key: "pipe_step_name", type: "string", label: "Pipeline step" },
    { key: "creation_date", type: "string", label: "Creation date" },
  ],
  sample: {
    id: 4401,
    name: "Website redesign",
    amount: 12000,
    pipe_name: "Sales",
    pipe_step_name: "Proposal",
    creation_date: "2026-11-09",
  },
});
