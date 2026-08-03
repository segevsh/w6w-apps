import type { ActionDefinition } from "@w6w/types";
import { JotformClient, submissionFields } from "../lib/client.ts";

interface Input {
  submissionId: string;
  answers: Record<string, unknown>;
}

/**
 * POST /submission/{submissionID} — edit an existing submission.
 *
 * Same `submission[...]` form encoding as Create Submission. The docs' example
 * shows both answer keys and the two submission-level flags in one payload:
 *
 *   `-d "submission[1_first]=Johny" -d "submission[new]=1" -d "submission[flag]=0"`
 *
 * so `new` (unread) and `flag` (starred) go through the same answers map.
 */
const submissionEdit: ActionDefinition<Input> = {
  key: "submission-edit",
  type: "perform",
  resource: "submission",
  title: "Edit Submission",
  description: "Update an existing submission's answers, or its read/flag state.",
  // A field-set update against a known submission id: replaying it lands the
  // same values on the same record.
  idempotent: true,
  params: [
    {
      key: "submissionId",
      label: "Submission ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Submissions.",
    },
    {
      key: "answers",
      label: "Fields to set",
      type: "json",
      required: true,
      hint: 'Map of question ID to new answer, e.g. {"1_first": "Johny"}. Also accepts the ' +
        'submission-level keys "new" (1 = unread) and "flag" (1 = starred). Only the keys you ' +
        "send are changed.",
    },
  ],
  output: [
    { key: "submissionID", type: "string", label: "Submission ID" },
    { key: "URL", type: "string", label: "Submission API URL" },
  ],

  // `async` so a malformed `answers` map surfaces as a rejected promise rather
  // than a synchronous throw out of the hook call.
  async execute(input, ctx) {
    ctx.log("info", "editing Jotform submission", { submissionId: input.submissionId });
    return await new JotformClient(ctx).content<Record<string, unknown>>(
      `/submission/${encodeURIComponent(input.submissionId)}`,
      { method: "POST", form: submissionFields(input.answers ?? {}) },
    );
  },
};

export default submissionEdit;
