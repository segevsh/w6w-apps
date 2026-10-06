import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";

interface Input {
  submissionId: string;
}

/**
 * `DELETE /submissions/{submissionId}` — answers 204. A submission quarantined as spam cannot be
 * deleted early: Formspark answers `409 conflict` and the item expires on its own.
 */
const submissionDelete: ActionDefinition<Input> = {
  key: "submission-delete",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description: "Delete one submission. Spam-quarantined submissions are refused (409) and " +
    "expire on their own. Requires submissions:write on an upgraded workspace.",
  idempotent: false,
  params: [{
    key: "submissionId",
    label: "Submission ID",
    type: "string",
    required: true,
    hint: "The `id` of an item from the submission list actions.",
  }],
  output: [
    { key: "deleted", type: "boolean", label: "True when Formspark answered 204" },
    { key: "id", type: "string", label: "The deleted submission's ID" },
  ],

  async execute(input, ctx) {
    const id = seg(input.submissionId, "submissionId");
    await new FormsparkClient(ctx).request(`/submissions/${id}`, { method: "DELETE" });
    return { deleted: true, id: input.submissionId.trim() };
  },
};

export default submissionDelete;
