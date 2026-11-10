import { PAGE_SIZE, sinceTrigger } from "../lib/triggers.ts";
import submissionGetMany from "../actions/submission-get-many.ts";

interface Submission {
  id?: string;
  submittedAt?: string;
  createdAt?: string;
}

// Tally: GET /forms/{formId}/submissions takes `startDate` ("Filter submissions submitted on or after
// this date (ISO 8601 format)") and `page`; the list has no documented sort order, so every page of
// the window is read (https://developers.tally.so/api-reference/endpoint/forms/submissions/list,
// verified 2026-11-09). Since-filter shape, brief 9.1 b.
export default sinceTrigger<Submission, { formId: string }>({
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each newly completed submission of the selected form.",
  params: (submissionGetMany.params ?? []).filter((p) => p.key === "formId"),
  async fetchPage(sinceMs, page, ctx, params) {
    const res = await submissionGetMany.execute({
      formId: params.formId,
      filter: "completed",
      startDate: new Date(sinceMs).toISOString(),
      page,
      limit: PAGE_SIZE,
    }, ctx) as { submissions?: Submission[]; hasMore?: boolean };
    return { items: res.submissions ?? [], more: res.hasMore === true };
  },
  idOf: (s) => String(s.id ?? ""),
  createdAtMs: (s) => {
    const ms = Date.parse(s.submittedAt ?? s.createdAt ?? "");
    return Number.isFinite(ms) ? ms : undefined;
  },
  output: [
    { key: "id", type: "string", label: "Submission ID" },
    { key: "formId", type: "string", label: "Form ID" },
    { key: "submittedAt", type: "string", label: "Submitted at" },
    { key: "isCompleted", type: "boolean", label: "Completed" },
    { key: "responses", type: "array", label: "Answers" },
  ],
  sample: {
    id: "sub_101",
    formId: "form_1",
    submittedAt: "2026-11-09T00:00:00.000Z",
    isCompleted: true,
    responses: [],
  },
});
