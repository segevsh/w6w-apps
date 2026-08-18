import type { ActionDefinition } from "@w6w/types";
import { csv, SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/releases/` — verified against Sentry's
 * OpenAPI schema (`listOrganizationReleases`; scopes `project:releases` among
 * others).
 */
const action: ActionDefinition = {
  key: "release-list",
  type: "read",
  resource: "release",
  title: "List releases",
  description: "List an organization's releases, newest first.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    {
      key: "projects",
      label: "Project IDs or Slugs",
      type: "string",
      default: "",
      hint: "Comma-separated. Leave blank for the whole organization.",
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      hint: "Case-insensitive substring match against the release version.",
    },
    {
      key: "environment",
      label: "Environments",
      type: "string",
      default: "",
      hint: "Comma-separated environment names.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      project: csv(p.projects),
      query: (p.query as string) || undefined,
      environment: csv(p.environment),
    };

    ctx.log("info", "listing Sentry releases", { org, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/releases/`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
