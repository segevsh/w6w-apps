import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/members/` — verified against Sentry's
 * OpenAPI schema (`listOrganizationMembers`; scopes `member:read`).
 *
 * The member ids this returns are what `issue-update` wants for its
 * `user:<id>` assignee form.
 */
const action: ActionDefinition = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List members",
  description: "List an organization's members, with their roles and teams.",
  params: [ORG_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Sentry members", { org, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/members/`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
