import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/` — verified against Sentry's OpenAPI schema
 * (`getOrganization`; scopes `org:read`).
 */
const action: ActionDefinition = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get an organization",
  description: "Retrieve one organization's details.",
  params: [
    ORG_PARAM,
    {
      key: "detailed",
      label: "Include Projects and Teams",
      type: "boolean",
      default: true,
      hint: "Sentry's `detailed` flag — turn it off for a much smaller payload.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "object", label: "Status" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "features", type: "array", label: "Features" },
    { key: "access", type: "array", label: "Access scopes" },
    { key: "projects", type: "array", label: "Projects" },
    { key: "teams", type: "array", label: "Teams" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "getting Sentry organization", { org });

    return await client.request(`/organizations/${encodeURIComponent(org)}/`, {
      // Sentry reads this one as the string "0"/"1", not a boolean.
      query: { detailed: p.detailed === false ? "0" : "1" },
    });
  },
};

export default action;
