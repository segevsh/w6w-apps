import { loadAll, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/proposal-draft-list.ts";

// The draft list has no sort or created-since filter
// (https://docs.sayanchor.com/reference/listproposaldrafts-1); whole collection (≤ 5000 rows,
// default statuses active+scheduled) diffed by id.
export default snapshotTrigger({
  key: "new-proposal-draft",
  title: "New Proposal Draft",
  description: "The run gets each newly created proposal draft.",
  load: (_params, ctx) => loadAll(action, {}, ctx),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Draft ID" },
    { key: "name", type: "string", label: "Draft name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "draft-101", name: "Tax consult", status: "active" },
});
