import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
  submissionId: string;
}

/**
 * DELETE /forms/{formId}/submissions/{submissionId} — delete a submission.
 *
 * Responds 204 with no body. Tally's help page notes deleted submissions move
 * to trash with a recovery window rather than vanishing immediately, so this is
 * recoverable in the UI for a period the vendor does not put a number on here.
 */
const submissionDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "submission-delete",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description: "Delete a single submission. Tally moves it to trash rather than erasing it.",
  idempotent: true,
  params: [
    formIdParam,
    {
      key: "submissionId",
      label: "Submission ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Submissions.",
    },
  ],
  output: [
    { key: "submissionId", type: "string", label: "Deleted submission ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Tally submission", { submissionId: input.submissionId });
    await new TallyClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/submissions/${
        encodeURIComponent(input.submissionId)
      }`,
      { method: "DELETE" },
    );
    return { submissionId: input.submissionId, deleted: true };
  },
};

export default submissionDelete;
