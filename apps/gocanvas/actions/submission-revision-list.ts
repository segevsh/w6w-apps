import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  submissionId: number;
}

const submissionRevisionList: ActionDefinition<Input> = {
  key: "submission-revision-list",
  type: "read",
  resource: "submission",
  title: "List Submission Revisions",
  description:
    "List the revision history of a submission, newest first. Empty for a submission that was never edited.",
  params: [
    idParam("submissionId", "Submission ID"),
  ],
  output: [
    { key: "data", type: "array", label: "Revisions" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(
      `/submissions/${encodeId(input.submissionId)}/revisions`,
    );
  },
};

export default submissionRevisionList;
