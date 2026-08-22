import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, query } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/orgs` — the organisations this service account can see.
 *
 * ## An empty list is a permissions answer, not an empty account
 *
 * A service account is created inside an organisation and then granted roles.
 * One that has been created and not granted anything **authenticates
 * perfectly and sees nothing** — no error, no hint, an empty `results` array.
 * That is the single most confusing state this credential has, so this action
 * says so rather than returning zero quietly.
 *
 * ## The organisation is the billing boundary; the project is everything else
 *
 * Clusters, database users, access lists and alerts all belong to a *project*
 * (`groups` in the paths). The organisation owns projects, holds the payment
 * method, and is where service accounts and roles live.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description:
    "The organisations this service account can reach. An EMPTY result means the account exists " +
    "and has been granted no role — it authenticates perfectly and sees nothing.",
  params: [...PAGE_PARAMS],
  output: [
    { key: "organizations", type: "array", label: "The organisations" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "ids", type: "array", label: "Just the ids" },
    { key: "totalCount", type: "number", label: "Across all pages" },
    { key: "hasAccess", type: "boolean", label: "False when the account has no role anywhere" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { results, totalCount } = await new AtlasClient(ctx).list<
      { id?: string; name?: string; isDeleted?: boolean }
    >("/api/atlas/v2/orgs", {
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    if (!results.length) {
      ctx.log(
        "warn",
        "this Atlas service account can see no organisations — it has been created but not " +
          "granted a role",
        {},
      );
    }

    return {
      organizations: results,
      count: results.length,
      ids: results.map((org) => org?.id).filter(Boolean),
      totalCount,
      hasAccess: results.length > 0,
    };
  },
};

export default action;
