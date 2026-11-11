import { pollFromListAction } from "../../_shared/poll/mod.ts";
import severityList from "../actions/severity-list.ts";

/** `GET /v1/severities` with `sort=-created_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-severity",
  title: "New Severity",
  description: "The run gets each newly created incident severity.",
  action: severityList,
  input: () => ({ sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id) + "",
  output: [
    { key: "id", type: "string", label: "Severity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "severity", type: "string", label: "Level" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "sev_1",
    type: "severities",
    name: "SEV1",
    slug: "sev1",
    severity: "critical",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
