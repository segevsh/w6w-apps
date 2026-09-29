import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { partialSubmissionIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /partial-submissions/{id}` — delete a partial submission by ID, without needing the
 * parent form.
 *
 * `idempotent: true` — see `delete-form-submission` for why.
 */
const deletePartialSubmission: ActionDefinition<Input> = {
  key: "delete-partial-submission",
  type: "perform",
  resource: "partial-submission",
  title: "Delete Partial Submission",
  description: "Delete a partial (in-progress, not yet submitted) submission by ID, without " +
    "needing the parent form's slug or ID.",
  idempotent: true,
  params: [partialSubmissionIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting Paperform partial submission", { id: input.id });
    const deleted = await new PaperformClient(ctx).deleted(
      `/partial-submissions/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { deleted };
  },
};

export default deletePartialSubmission;
