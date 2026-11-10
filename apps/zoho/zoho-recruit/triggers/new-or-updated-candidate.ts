import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/candidate-list.ts";

export default pollFromListAction({
  key: "new-or-updated-candidate",
  title: "New or Updated Candidate",
  description: "Polls the existing candidate-list action ordered by Modified_Time descending.",
  action,
  input: () => ({ page: 1, per_page: 100, sort_by: "Modified_Time", sort_order: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${
      (item as { Modified_Time?: unknown }).Modified_Time ?? ""
    }`,
  output: [{ key: "id", type: "string", label: "Candidate ID" }],
  sample: { id: "candidate-101", Modified_Time: "2026-11-09T12:00:00+00:00" },
});
