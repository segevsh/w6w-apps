import { pollFromListAction } from "../../_shared/poll/mod.ts";
import runList from "../actions/run-list.ts";

export default pollFromListAction({
  key: "new-run",
  title: "New Run",
  description: "The run gets each newly created Skyvern run.",
  action: runList,
  input: () => ({ page: 1, pageSize: 100 }),
  items: (result) => (result as { runs?: unknown[] }).runs ?? [],
  idOf: (item) =>
    String(
      (item as { run_id?: unknown; id?: unknown }).run_id ?? (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "run_id", type: "string", label: "Run ID" }],
  sample: { run_id: "run-101", created_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
