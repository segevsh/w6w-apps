import { pollFromListAction } from "../../_shared/poll/mod.ts";
import leadList from "../actions/lead-list.ts";

/** Workiz documents /lead/all/ as LeadDateTime-descending by default. */
export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each newly scheduled Workiz lead.",
  action: leadList,
  input: () => ({ records: 100, offset: 0, only_open: false }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { UUID?: unknown }).UUID ?? ""),
  output: [{ key: "UUID", type: "string", label: "Lead ID" }],
  sample: { UUID: "lead-sample", LeadDateTime: "2026-11-10T12:00:00Z" },
  maxPages: 1,
});
