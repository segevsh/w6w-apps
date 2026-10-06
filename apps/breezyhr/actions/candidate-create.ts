import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, compact, jsonValue, position, strList } from "../lib/client.ts";
import { CANDIDATE_OUTPUT, companyIdParam, positionIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  name: string;
  emailAddress?: string;
  phoneNumber?: string;
  address?: string;
  summary?: string;
  coverLetter?: string;
  tags?: string[] | string;
  origin?: string;
  source?: string;
  workHistory?: unknown;
  education?: unknown;
  socialProfiles?: unknown;
  customAttributes?: unknown;
  stageActionsEnabled?: boolean;
}

/**
 * `POST /company/{id}/position/{id}/candidates`. `origin: sourced` (default) drops the candidate
 * into "Applied"; `origin: applied` follows the public-application path (email required, position
 * must be published, else 412) and answers **202** when required application-form fields are
 * missing — Breezy then emails the candidate a link, so there is no candidate record yet.
 * 409 means the candidate already exists on the position.
 */
const candidateCreate: ActionDefinition<Input> = {
  key: "candidate-create",
  type: "perform",
  resource: "candidate",
  title: "Create Candidate",
  description:
    "Add a candidate to a position, as sourced (straight into Applied) or as if they had applied. Fails with 409 if they are already on the position.",
  idempotent: false,
  params: [
    companyIdParam,
    positionIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "emailAddress",
      label: "Email",
      type: "string",
      hint: "Required when Origin is `applied`.",
    },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "summary", label: "Summary", type: "text" },
    { key: "coverLetter", label: "Cover letter", type: "text" },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    {
      key: "origin",
      label: "Origin",
      type: "select",
      default: "sourced",
      hint:
        "`applied` requires a published position and may only be accepted (202) pending the candidate completing the form.",
      options: [
        { value: "sourced", label: "Sourced" },
        { value: "applied", label: "Applied" },
      ],
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Where the candidate came from, e.g. LinkedIn.",
    },
    {
      key: "workHistory",
      label: "Work history",
      type: "json",
      hint:
        '[{"company_name":"Acme","title":"Engineer","summary":"…","start_month":1,"start_year":2020,"end_month":6,"end_year":2023}]; company_name is required.',
    },
    {
      key: "education",
      label: "Education",
      type: "json",
      hint: '[{"school_name":"MIT","field_of_study":"CS","start_year":2014,"end_year":2018}]',
    },
    {
      key: "socialProfiles",
      label: "Social profiles",
      type: "json",
      hint:
        'Network name to URL, e.g. {"linkedin":"https://linkedin.com/in/x"}; keys must be supported networks.',
    },
    {
      key: "customAttributes",
      label: "Custom attributes",
      type: "json",
      hint: '[{"name":"Referral","value":"Jane","secure":false}]; name and value are required.',
    },
    {
      key: "stageActionsEnabled",
      label: "Run stage actions",
      type: "boolean",
      hint: "For sourced candidates: whether the Applied stage's automations (emails…) fire.",
    },
  ],
  output: [
    ...CANDIDATE_OUTPUT,
    {
      key: "accepted",
      type: "boolean",
      label: "True when Breezy answered 202: the candidate must finish the application form first",
    },
    { key: "message", type: "string", label: "Breezy's note when accepted (202)" },
  ],

  async execute(input, ctx) {
    const reply = await new BreezyClient(ctx).send(
      "POST",
      `${position(input.companyId, input.positionId)}/candidates`,
      {
        query: { stage_actions_enabled: input.stageActionsEnabled },
        body: compact({
          name: input.name,
          email_address: input.emailAddress || undefined,
          phone_number: input.phoneNumber || undefined,
          address: input.address || undefined,
          summary: input.summary || undefined,
          cover_letter: input.coverLetter || undefined,
          tags: strList(input.tags),
          origin: input.origin || undefined,
          source: input.source || undefined,
          work_history: jsonValue(input.workHistory),
          education: jsonValue(input.education),
          social_profiles: jsonValue(input.socialProfiles),
          custom_attributes: jsonValue(input.customAttributes),
        }),
      },
    );
    if (reply.status === 202) {
      const message = (reply.data as { error?: { message?: string } }).error?.message;
      return { accepted: true, ...(message ? { message } : {}) };
    }
    return reply.data;
  },
};

export default candidateCreate;
