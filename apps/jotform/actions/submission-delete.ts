import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface Input {
  submissionId: string;
}

/**
 * DELETE /submission/{submissionID} — delete one submission.
 *
 * `content` is a human-readable string ("Submission #… deleted successfully."),
 * not an object, so it is returned under `message`.
 */
const submissionDelete: ActionDefinition<Input> = {
  key: "submission-delete",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description: "Permanently delete a single submission.",
  // Deleting an already-deleted submission converges on the same end state.
  idempotent: true,
  params: [
    {
      key: "submissionId",
      label: "Submission ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Submissions.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Jotform submission", { submissionId: input.submissionId });
    const content = await new JotformClient(ctx).content<string>(
      `/submission/${encodeURIComponent(input.submissionId)}`,
      { method: "DELETE" },
    );
    return { message: content };
  },
};

export default submissionDelete;
