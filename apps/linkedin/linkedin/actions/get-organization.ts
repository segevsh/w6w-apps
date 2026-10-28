import type { ActionDefinition } from "@w6w/types";
import { LinkedInClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
}

/**
 * `GET /rest/organizations/{organizationId}` — Organization Lookup API.
 * Requires the numeric company-page id (not a URN) and `rw_organization_admin`;
 * LinkedIn restricts full-field results ("Admin Only" columns in its schema)
 * to members with the `ADMINISTRATOR` role on that organization, returning
 * `403 Forbidden` otherwise.
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api
 */
const getOrganization: ActionDefinition<Input> = {
  key: "get-organization",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description:
    "Fetch a company page's profile by its numeric id. Requires the Community Management " +
    "auth method and an ADMINISTRATOR role on that page.",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: "The numeric company page id, e.g. 5515715 (not a urn:li:organization:... URN).",
    },
  ],

  execute(input, ctx) {
    const client = new LinkedInClient(ctx);
    return client.request(`/rest/organizations/${encodeURIComponent(input.organizationId)}`);
  },
};

export default getOrganization;
