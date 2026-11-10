import { loadAll, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/agreement-list.ts";

// The agreement list has no sort or created-since filter
// (https://docs.sayanchor.com/reference/listagreements-1); whole collection (≤ 5000 rows)
// diffed by id.
export default snapshotTrigger({
  key: "new-agreement",
  title: "New Agreement",
  description: "The run gets each newly signed agreement.",
  load: (_params, ctx) => loadAll(action, {}, ctx),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Agreement ID" },
    { key: "name", type: "string", label: "Agreement name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "agreement-101", name: "Tax consult", status: "active" },
});
