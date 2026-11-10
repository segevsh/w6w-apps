import { loadAll, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/proposal-template-list.ts";

// The template list has no sort or created-since filter
// (https://docs.sayanchor.com/reference/listproposaltemplates-1); whole collection (≤ 5000
// rows) diffed by id.
export default snapshotTrigger({
  key: "new-proposal-template",
  title: "New Proposal Template",
  description: "The run gets each newly saved proposal template.",
  load: (_params, ctx) => loadAll(action, {}, ctx),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "lastUpdatedOn", type: "string", label: "Last updated on" },
  ],
  sample: { id: "template-101", lastUpdatedOn: "2026-11-01T10:00:00Z" },
});
