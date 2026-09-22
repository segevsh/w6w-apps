import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { profileUrlParam } from "../lib/params.ts";

interface Input {
  profileUrl: string;
}

/**
 * `POST /api/public/lead/GetLead` — the profile HeyReach holds for a lead.
 *
 * The document types the body as `{ profileUrl }` and spells it out in prose
 * ("This parameter is required"), so that is the whole request.
 *
 * The response is the widest lead object the API returns: identity
 * (`linkedin_id`, `username`, `profileUrl`), the scraped profile (`headline`,
 * `companyName`, `position`, `location`, `about`, `experiences`, `education`,
 * `connections`, `followers`) and — separately from `emailAddress` —
 * `enrichedEmailAddress`, which is the value HeyReach's own enrichment
 * resolved. Both email fields are nullable: the document declares `oneOf: null`
 * on them, and the enrichment does not always resolve.
 */
const action: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch the LinkedIn profile details HeyReach holds for a lead, by profile URL " +
    "(POST /api/public/lead/GetLead).",
  params: [profileUrlParam],
  output: [
    { key: "linkedin_id", type: "string", label: "LinkedIn member ID" },
    { key: "fullName", type: "string", label: "Full name" },
    { key: "headline", type: "string", label: "Headline" },
    { key: "companyName", type: "string", label: "Company" },
    { key: "position", type: "string", label: "Position" },
    { key: "profileUrl", type: "string", label: "LinkedIn profile URL" },
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "enrichedEmailAddress", type: "string", label: "Enriched email address" },
    { key: "connections", type: "number", label: "Connections" },
    { key: "followers", type: "number", label: "Followers" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/lead/GetLead", {
      method: "POST",
      body: { profileUrl: input.profileUrl },
    });
  },
};

export default action;
