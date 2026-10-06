import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  jobId: string;
}

const FIELDS: readonly Field[] = [
  ["jobId", "job_id", "s"],
];

const jobPublish: ActionDefinition<Input, ActionResult> = {
  key: "job-publish",
  type: "perform",
  resource: "recruiter",
  title: "Publish Job Posting",
  description: "Publish a draft job posting.",
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "recruiter",
      "publish_job",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default jobPublish;
