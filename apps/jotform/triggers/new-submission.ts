import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import submissionGetMany from "../actions/submission-get-many.ts";

export default pollFromListAction<{ formId: string }>({
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each new submission for the selected Jotform form.",
  action: submissionGetMany as unknown as ActionDefinition,
  input: (params) => ({
    formId: params.formId,
    offset: 0,
    limit: 100,
    orderby: "created_at",
    direction: "DESC",
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "formId", label: "Form ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Submission ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "submission_123", created_at: "2026-11-09 12:00:00" },
});
