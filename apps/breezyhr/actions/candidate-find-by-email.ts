import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  emailAddress: string;
}

/**
 * `GET /company/{id}/candidates/search?email_address=` — exact match on the normalised email,
 * across all positions, read from the primary store (immediately consistent, unlike the indexed
 * free-text search). The prose says each entry carries only `_id`, `name`, `creation_date` and
 * `position`, while the published schema lists the full list-candidate shape; the entries are
 * returned as sent.
 */
const candidateFindByEmail: ActionDefinition<Input> = {
  key: "candidate-find-by-email",
  type: "search",
  resource: "candidate",
  title: "Find Candidate by Email",
  description:
    "Find the candidates in a company whose email address matches exactly, across every position. Immediately consistent.",
  params: [
    companyIdParam,
    { key: "emailAddress", label: "Email", type: "string", required: true },
  ],
  output: [
    {
      key: "candidates",
      type: "array",
      label: "Matches (at least _id, name, creation_date and position)",
    },
  ],

  async execute(input, ctx) {
    return {
      candidates: await new BreezyClient(ctx).array(
        `${company(input.companyId)}/candidates/search`,
        { query: { email_address: input.emailAddress } },
      ),
    };
  },
};

export default candidateFindByEmail;
