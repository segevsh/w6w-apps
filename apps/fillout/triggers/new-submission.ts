import { pollFromListAction } from "../../_shared/poll/mod.ts";
import submissionList from "../actions/submission-list.ts";

export default pollFromListAction<{ formId?: string }>({
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each newly submitted response for the selected form.",
  action: submissionList as never,
  input: (params) => ({ formId: params.formId, limit: 100, offset: 0, sort: "desc" }),
  params: [{ key: "formId", label: "Form ID", type: "string", required: true }],
  items: (result) =>
    Array.isArray((result as { responses?: unknown[] }).responses)
      ? (result as { responses: unknown[] }).responses
      : [],
  idOf: (item) =>
    String(
      (item as { submissionId?: unknown; id?: unknown }).submissionId ??
        (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "submissionId", type: "string", label: "Submission ID" }],
  sample: { submissionId: "sub_1" },
  maxPages: 1,
});
