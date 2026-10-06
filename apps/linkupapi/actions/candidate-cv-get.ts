import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  applicationId: string;
}

const FIELDS: readonly Field[] = [
  ["applicationId", "application_id", "s"],
];

const candidateCvGet: ActionDefinition<Input, ActionResult> = {
  key: "candidate-cv-get",
  type: "read",
  resource: "recruiter",
  title: "Get Candidate CV",
  description: "Read the CV of one applicant.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    {
      key: "applicationId",
      label: "Application ID",
      type: "string",
      required: true,
      hint: "From Get Job Candidates.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "recruiter",
      "get_cv",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default candidateCvGet;
