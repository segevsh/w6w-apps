import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  jobId?: string;
  count?: number;
  offset?: number;
  fetchDetails?: boolean;
}

const FIELDS: readonly Field[] = [
  ["jobId", "job_id", "s"],
  ["count", "count", "n"],
  ["offset", "offset", "n"],
  ["fetchDetails", "fetch_details", "b"],
];

const jobList: ActionDefinition<Input, ActionResult> = {
  key: "job-list",
  type: "read",
  resource: "recruiter",
  title: "Get Job Posts",
  description: "List the job postings of the recruiter account, or fetch one by id.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    { key: "jobId", label: "Job ID", type: "string", hint: "Fetch one posting." },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of job posts to return (default 10).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
    {
      key: "fetchDetails",
      label: "Fetch details",
      type: "boolean",
      hint: "Include full descriptions (default true); false is faster.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "recruiter",
      "get_posts",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default jobList;
