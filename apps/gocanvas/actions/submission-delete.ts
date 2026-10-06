import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient, hardDeleteQuery } from "../lib/client.ts";
import { hardDeleteParam } from "../lib/params.ts";

interface Input {
  submissionId: string;
  hardDelete?: boolean;
}

const submissionDelete: ActionDefinition<Input> = {
  key: "submission-delete",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description:
    "Soft-delete a submission (kept, hidden from the web views) or permanently delete it. Accepts a numeric id or a GUID.",
  idempotent: true,
  params: [
    { key: "submissionId", label: "Submission ID or GUID", type: "string", required: true },
    hardDeleteParam,
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation" },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(`/submissions/${encodeId(input.submissionId)}`, {
        method: "DELETE",
        query: hardDeleteQuery(input.hardDelete),
      }),
    );
  },
};

export default submissionDelete;
