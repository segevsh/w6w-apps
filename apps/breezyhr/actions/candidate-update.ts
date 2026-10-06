import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate, compact, jsonValue, strList } from "../lib/client.ts";
import { CANDIDATE_OUTPUT, candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  name?: string;
  emailAddress?: string;
  phoneNumber?: string;
  address?: string;
  summary?: string;
  coverLetter?: string;
  headline?: string;
  source?: string;
  tags?: string[] | string;
  socialProfiles?: unknown;
  customAttributes?: unknown;
}

/**
 * `PUT …/candidate/{id}` — a partial update. Only `name`, `email_address`, `phone_number`,
 * `summary`, `source`, `headline`, `tags`, `address`, `social_profiles`, `custom_attributes` and
 * `cover_letter` are accepted; anything else is silently ignored.
 */
const candidateUpdate: ActionDefinition<Input> = {
  key: "candidate-update",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate",
  description:
    "Change a candidate's contact details, headline, summary, source, tags or custom attributes. Only the fields you set change.",
  idempotent: true,
  params: [
    ...candidateParams,
    { key: "name", label: "Name", type: "string" },
    { key: "emailAddress", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "headline", label: "Headline", type: "string" },
    { key: "summary", label: "Summary", type: "text" },
    { key: "coverLetter", label: "Cover letter", type: "text" },
    { key: "source", label: "Source", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Replaces the candidate's tags.",
    },
    {
      key: "socialProfiles",
      label: "Social profiles",
      type: "json",
      hint: 'Network name to URL, e.g. {"linkedin":"https://linkedin.com/in/x"}.',
    },
    {
      key: "customAttributes",
      label: "Custom attributes",
      type: "json",
      hint: '[{"name":"Referral","value":"Jane"}]',
    },
  ],
  output: CANDIDATE_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "PUT",
      candidate(input.companyId, input.positionId, input.candidateId),
      {
        body: compact({
          name: input.name,
          email_address: input.emailAddress,
          phone_number: input.phoneNumber,
          address: input.address,
          headline: input.headline,
          summary: input.summary,
          cover_letter: input.coverLetter,
          source: input.source,
          tags: input.tags === undefined ? undefined : (strList(input.tags) ?? []),
          social_profiles: jsonValue(input.socialProfiles),
          custom_attributes: jsonValue(input.customAttributes),
        }),
      },
    );
  },
};

export default candidateUpdate;
