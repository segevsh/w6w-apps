import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { partialSubmissionIdParam, slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  id: string;
}

/**
 * `DELETE /forms/{slug_or_id}/partial-submissions/{id}` — delete a partial submission, scoped
 * to a form.
 *
 * `idempotent: true` — see `delete-form-submission` for why.
 */
const deleteFormPartialSubmission: ActionDefinition<Input> = {
  key: "delete-form-partial-submission",
  type: "perform",
  resource: "partial-submission",
  title: "Delete Form Partial Submission",
  description: "Delete a partial (in-progress, not yet submitted) submission, scoped to a form.",
  idempotent: true,
  params: [slugOrIdParam, partialSubmissionIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting Paperform partial submission", { id: input.id });
    const deleted = await new PaperformClient(ctx).deleted(
      `/forms/${encodeURIComponent(input.slugOrId)}/partial-submissions/${
        encodeURIComponent(input.id)
      }`,
      { method: "DELETE" },
    );
    return { deleted };
  },
};

export default deleteFormPartialSubmission;
