import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/teams/` — verified against Sentry's OpenAPI
 * schema (`listOrganizationTeams`; scopes `org:read`).
 */
const action: ActionDefinition = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List teams",
  description: "List an organization's teams.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    { key: "query", label: "Query", type: "string", default: "", hint: "Filter by name or slug." },
    {
      key: "detailed",
      label: "Include Projects",
      type: "boolean",
      default: true,
      hint: "Sentry's `detailed` flag — turn it off to omit each team's projects.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Sentry teams", { org, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/teams/`,
      {
        query: {
          query: (p.query as string) || undefined,
          // Sentry reads this one as the string "0"/"1", not a boolean.
          detailed: p.detailed === false ? "0" : "1",
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
