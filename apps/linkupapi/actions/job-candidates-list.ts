import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  jobId: string;
  count?: number;
  offset?: number;
  ratings?: string;
  sortType?: string;
  sortOrder?: string;
}

const FIELDS: readonly Field[] = [
  ["jobId", "job_id", "s"],
  ["count", "count", "n"],
  ["offset", "offset", "n"],
  ["ratings", "ratings", "s"],
  ["sortType", "sortType", "s"],
  ["sortOrder", "sortOrder", "s"],
];

const jobCandidatesList: ActionDefinition<Input, ActionResult> = {
  key: "job-candidates-list",
  type: "read",
  resource: "recruiter",
  title: "Get Job Candidates",
  description: "List the candidates who applied to a job posting.",
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
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of candidates to return (default 10).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
    {
      key: "ratings",
      label: "Ratings",
      type: "string",
      hint: "Comma-separated: GOOD_FIT, MAYBE, UNRATED, NOT_A_FIT (default all).",
    },
    {
      key: "sortType",
      label: "Sort by",
      type: "select",
      options: [{ "value": "RELEVANCE", "label": "RELEVANCE" }, {
        "value": "APPLIED_DATE",
        "label": "APPLIED_DATE",
      }],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ "value": "DESCENDING", "label": "DESCENDING" }, {
        "value": "ASCENDING",
        "label": "ASCENDING",
      }],
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "recruiter",
      "get_candidates",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default jobCandidatesList;
