import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/projects/` — verified against Sentry's
 * OpenAPI schema (`listOrganizationProjects`; scopes `org:read`).
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description: "List the projects in an organization.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      hint: "Filter projects by name or slug.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Sentry projects", { org, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/projects/`,
      { query: { query: (p.query as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
