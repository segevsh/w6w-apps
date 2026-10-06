import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  companyUrl: string;
  title: string;
  place: string;
  htmlDescription: string;
  employmentStatus?: string;
  workplace?: string;
  contactEmail?: string;
  skills?: string;
  jobFunctions?: string;
  industrySectors?: string;
  autoRejectionTemplate?: string;
}

const FIELDS: readonly Field[] = [
  ["companyUrl", "company_url", "s"],
  ["title", "title", "s"],
  ["place", "place", "s"],
  ["htmlDescription", "html_description", "s"],
  ["employmentStatus", "employment_status", "s"],
  ["workplace", "workplace", "s"],
  ["contactEmail", "contact_email", "s"],
  ["skills", "skills", "m"],
  ["jobFunctions", "job_functions", "m"],
  ["industrySectors", "industry_sectors", "m"],
  ["autoRejectionTemplate", "auto_rejection_template", "s"],
];

const jobCreate: ActionDefinition<Input, ActionResult> = {
  key: "job-create",
  type: "perform",
  resource: "recruiter",
  title: "Create Job Posting",
  description: "Create a job posting in draft state; publish it with Publish Job Posting.",
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
    {
      key: "companyUrl",
      label: "Company URL",
      type: "string",
      required: true,
      hint: "URL of the LinkedIn company page.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "place",
      label: "Location",
      type: "string",
      required: true,
      hint: "For example Paris, France.",
    },
    {
      key: "htmlDescription",
      label: "Description",
      type: "text",
      required: true,
      hint: "Basic HTML: p, strong, ul and li.",
    },
    {
      key: "employmentStatus",
      label: "Employment type",
      type: "select",
      options: [
        { "value": "FULL_TIME", "label": "FULL_TIME" },
        { "value": "PART_TIME", "label": "PART_TIME" },
        { "value": "CONTRACT", "label": "CONTRACT" },
        { "value": "TEMPORARY", "label": "TEMPORARY" },
        { "value": "VOLUNTEER", "label": "VOLUNTEER" },
        { "value": "INTERNSHIP", "label": "INTERNSHIP" },
      ],
    },
    {
      key: "workplace",
      label: "Workplace",
      type: "select",
      hint: "1 on-site, 2 remote, 3 hybrid.",
      options: [{ "value": "1", "label": "1" }, { "value": "2", "label": "2" }, {
        "value": "3",
        "label": "3",
      }],
    },
    { key: "contactEmail", label: "Contact email", type: "string" },
    {
      key: "skills",
      label: "Skills",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    {
      key: "jobFunctions",
      label: "Job functions",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    {
      key: "industrySectors",
      label: "Industry sectors",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    { key: "autoRejectionTemplate", label: "Auto-rejection message", type: "string" },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "recruiter",
      "create_job",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default jobCreate;
