import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/job-candidates-list.ts";

interface Params {
  accountId: string;
  jobId: string;
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string") {
    throw new Error(`new-candidate: ${key} must be a string`);
  }
  return value;
}

const pollAction: ActionDefinition = {
  ...action,
  execute(input, ctx) {
    return action.execute({
      accountId: requiredString(input, "accountId"),
      jobId: requiredString(input, "jobId"),
      count: typeof input.count === "number" ? input.count : undefined,
      sortType: typeof input.sortType === "string" ? input.sortType : undefined,
      sortOrder: typeof input.sortOrder === "string" ? input.sortOrder : undefined,
    }, ctx);
  },
};

const trigger = pollFromListAction<Params>({
  key: "new-candidate",
  title: "New Candidate",
  description: "Fires for newly applied job candidates.",
  action: pollAction,
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
