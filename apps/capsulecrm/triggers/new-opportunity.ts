import { pollFromListAction } from "../../_shared/poll/mod.ts";
import opportunityList from "../actions/opportunity-list.ts";
export default pollFromListAction({
  key: "new-opportunity",
  title: "New Opportunity",
  description: "The run gets each newly changed Capsule opportunity.",
  action: opportunityList,
  input: (p: { since: string }) => ({ since: p.since, page: 1, perPage: 100 }),
  params: [{ key: "since", label: "Changed since", type: "datetime", required: true }],
  items: (r) => (r as { opportunities?: unknown[] }).opportunities ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Opportunity ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
