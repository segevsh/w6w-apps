import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/submission-get-many.ts";

export default pollFromListAction<{ formId: string }>({
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each newly completed submission for the selected form.",
  action: action as unknown as ActionDefinition,
  input: ({ formId }) => ({ formId, page: 1, limit: 100, filter: "completed" }),
  params: (action.params ?? []).filter((p) => p.key === "formId"),
  items: (result) => (result as { submissions?: unknown[] }).submissions ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Submission ID" }],
  sample: { id: "submission_101", createdAt: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
