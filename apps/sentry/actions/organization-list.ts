import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/` — verified against Sentry's OpenAPI schema
 * (`listOrganizations`; scopes `org:read`).
 *
 * The one endpoint here that takes no organization: it answers "which
 * organizations can this credential see", which is how you find the slug every
 * other action wants.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description: "List the organizations this connection can see.",
  params: [
    ...LIST_PARAMS,
    {
      key: "owner",
      label: "Only Ones I Own",
      type: "boolean",
      default: false,
      hint: "Restrict to organizations where the token's user is an owner.",
    },
    { key: "query", label: "Query", type: "string", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Sentry organizations", { returnAll, limit });

    return await client.requestAll(
      "/organizations/",
      {
        query: {
          owner: p.owner === true ? "true" : undefined,
          query: (p.query as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
