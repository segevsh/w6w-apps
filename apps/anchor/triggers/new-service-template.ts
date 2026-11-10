import { loadAll, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/service-template-list.ts";

// The service-template list has no sort or created-since filter
// (https://docs.sayanchor.com/reference/listservicetemplates-1); whole collection (≤ 5000 rows)
// diffed by id.
export default snapshotTrigger({
  key: "new-service-template",
  title: "New Service Template",
  description: "The run gets each newly created service template or bundle.",
  load: (_params, ctx) => loadAll(action, {}, ctx),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Service name" },
  ],
  sample: { id: "service-101", name: "Bookkeeping" },
});
