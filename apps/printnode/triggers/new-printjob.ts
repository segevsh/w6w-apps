import { pollFromListAction } from "../../_shared/poll/mod.ts";
import printjobList from "../actions/printjob-list.ts";

/** PrintNode documents the unfiltered print-jobs feed as newest first. */
export default pollFromListAction({
  key: "new-printjob",
  title: "New Print Job",
  description: "The run gets each newly created print job.",
  action: printjobList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Print job ID" }],
  sample: { id: 473, state: "queued" },
  maxPages: 1,
});
