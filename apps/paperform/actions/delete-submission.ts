import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { submissionIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /submissions/{id}` — delete a submission by ID, without needing the parent form.
 *
 * `idempotent: true` — see `delete-form-submission` for why.
 */
const deleteSubmission: ActionDefinition<Input> = {
  key: "delete-submission",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description: "Delete a submission by ID, without needing the parent form's slug or ID.",
  idempotent: true,
  params: [submissionIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting Paperform submission", { id: input.id });
    const deleted = await new PaperformClient(ctx).deleted(
      `/submissions/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { deleted };
  },
};

export default deleteSubmission;
