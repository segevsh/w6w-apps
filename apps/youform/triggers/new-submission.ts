import submissionList from "../actions/submission-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

interface Params {
  form: string;
}

export default pollFromListAction<Params>({
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each new Youform submission for a form.",
  action: submissionList as unknown as ActionDefinition,
  input: ({ form }) => ({
    form,
    sort_by: "created_at",
    sort_by_order: "desc",
    per_page: 100,
    page: 1,
  }),
  items: (result) => ((result as { data?: { data?: unknown[] } }).data?.data ?? []),
  idOf: (item) => String((item as { id: unknown }).id),
  params: [{ key: "form", label: "Form slug", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Submission ID" }],
  sample: { id: "submission_1", data: {} },
  maxPages: 1,
});
