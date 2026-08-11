import type { ActionDefinition } from "@w6w/types";
import { encodeId, FilloutClient } from "../lib/client.ts";
import { formIdParam, submissionIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/api/forms/{formId}/submissions/{submissionId}` — remove one
 * response.
 *
 * Fillout documents a `200` and **no response schema**, so there is nothing to
 * parse and nothing useful the vendor returns. This action reports the HTTP
 * status and the ids it acted on, which is what a later step can actually use.
 *
 * `idempotent: true` — the action names an exact submission and the end state
 * after two calls is the same as after one, so a retry after a dropped
 * connection is safe. Note what that does *not* claim: this is a destructive
 * call with no undo, and the fact that it is safe to *retry* is unrelated to
 * whether it is safe to *run*.
 */
interface Input {
  formId: string;
  submissionId: string;
}

interface Output {
  formId: string;
  submissionId: string;
  status: number;
}

const submissionDelete: ActionDefinition<Input, Output> = {
  key: "submission-delete",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description: "Permanently delete one submission from a form. There is no undo.",
  idempotent: true,
  params: [formIdParam, submissionIdParam],
  output: [
    { key: "formId", type: "string", label: "Form ID" },
    { key: "submissionId", type: "string", label: "Deleted submission ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new FilloutClient(ctx).status(
      `/forms/${encodeId(input.formId)}/submissions/${encodeId(input.submissionId)}`,
      { method: "DELETE" },
    );
    ctx.log("info", "deleted Fillout submission", {
      formId: input.formId,
      submissionId: input.submissionId,
    });
    return { formId: input.formId, submissionId: input.submissionId, status };
  },
};

export default submissionDelete;
