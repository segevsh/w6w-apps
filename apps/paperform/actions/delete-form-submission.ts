import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { slugOrIdParam, submissionIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  id: string;
}

/**
 * `DELETE /forms/{slug_or_id}/submissions/{id}` — delete a submission, scoped to a form.
 *
 * `idempotent: true` — the end state (submission gone) is the same however many times this
 * runs; Paperform documents no separate response for deleting an already-deleted submission.
 */
const deleteFormSubmission: ActionDefinition<Input> = {
  key: "delete-form-submission",
  type: "perform",
  resource: "submission",
  title: "Delete Form Submission",
  description: "Delete a submission, scoped to a form.",
  idempotent: true,
  params: [slugOrIdParam, submissionIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting Paperform submission", { id: input.id });
    const deleted = await new PaperformClient(ctx).deleted(
      `/forms/${encodeURIComponent(input.slugOrId)}/submissions/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { deleted };
  },
};

export default deleteFormSubmission;
