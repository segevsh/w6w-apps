import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";

interface Input {
  submissionId: string;
}

const submissionGet: ActionDefinition<Input> = {
  key: "submission-get",
  type: "read",
  resource: "submission",
  title: "Get Submission",
  description:
    'Fetch a submission with its responses, by numeric id or by GUID. Media responses read "Binary data is not displayed".',
  params: [
    { key: "submissionId", label: "Submission ID or GUID", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "The submission" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/submissions/${encodeId(input.submissionId)}`);
  },
};

export default submissionGet;
