import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface Input {
  submissionId: string;
}

/** GET /submission/{submissionID} — one submission with its full answer map. */
const submissionGet: ActionDefinition<Input> = {
  key: "submission-get",
  type: "read",
  resource: "submission",
  title: "Get Submission",
  description: "Retrieve a single submission and all of its answers.",
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
    { key: "id", type: "string", label: "Submission ID" },
    { key: "form_id", type: "string", label: "Form ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "status", type: "string", label: "Status (ACTIVE / OVERQUOTA)" },
    { key: "new", type: "string", label: "Unread flag (1 = unread)" },
    { key: "answers", type: "object", label: "Answers keyed by question ID" },
  ],

  execute(input, ctx) {
    return new JotformClient(ctx).content<Record<string, unknown>>(
      `/submission/${encodeURIComponent(input.submissionId)}`,
    );
  },
};

export default submissionGet;
