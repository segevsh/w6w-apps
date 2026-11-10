import { loadAll, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/proposal-list.ts";

// The proposal list has no sort or created-since filter
// (https://docs.sayanchor.com/reference/listproposals-1); whole collection (≤ 5000 rows,
// default statuses pending+expired) diffed by id.
export default snapshotTrigger({
  key: "new-proposal",
  title: "New Proposal",
  description: "The run gets each newly sent proposal.",
  load: (_params, ctx) => loadAll(action, {}, ctx),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Proposal ID" },
    { key: "name", type: "string", label: "Proposal name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "proposal-101", name: "Tax consult", status: "pending" },
});
