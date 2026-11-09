import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/job-candidates-list.ts";

interface Params {
  accountId: string;
  jobId: string;
}

const trigger = pollFromListAction<Params>({
  key: "new-candidate",
  title: "New Candidate",
  description: "Fires for newly applied job candidates.",
  action: action as never,
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }, {
    key: "jobId",
    label: "Job ID",
    type: "string",
    required: true,
  }],
  input: ({ accountId, jobId }) => ({
    accountId,
    jobId,
    count: 100,
    sortType: "APPLIED_DATE",
    sortOrder: "DESCENDING",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; candidate_id?: unknown }).id ??
        (item as { candidate_id?: unknown }).candidate_id,
    ),
  output: [{ key: "id", type: "string", label: "Candidate ID" }],
  sample: { id: "candidate-1" },
  maxPages: 1,
});

export default trigger;
