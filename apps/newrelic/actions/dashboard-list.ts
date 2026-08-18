import type { ActionDefinition } from "@w6w/types";
import { compact, NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * Dashboards, found the way everything else is — through `entitySearch`.
 *
 * A dashboard is an entity like any other (`domain = 'VIZ'`,
 * `type = 'DASHBOARD'`), which means it has a GUID, carries tags, and appears
 * in ordinary entity searches. There is no separate dashboards endpoint, and
 * looking for one is a reasonable thing to spend an afternoon on.
 *
 * The GUID is what `dashboard-get` and the tagging actions take.
 */
const action: ActionDefinition = {
  key: "dashboard-list",
  type: "read",
  resource: "dashboard",
  title: "List dashboards",
  description:
    "Dashboards on an account. There is no dashboards endpoint — a dashboard is an entity, " +
    "found through entity search like everything else.",
  params: [
    ACCOUNT_PARAM,
    {
      key: "name",
      label: "Name Contains",
      type: "string",
      default: "",
    },
    { key: "cursor", label: "Cursor", type: "string", default: "" },
  ],
  output: [
    { key: "dashboards", type: "array", label: "Dashboards, each with a guid" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "Total New Relic reports" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);

    const clauses = [`domain = 'VIZ'`, `type = 'DASHBOARD'`, `accountId = ${account}`];
    const name = String(p.name ?? "").trim();
    if (name) clauses.push(`name LIKE '${name.replace(/'/g, "")}'`);

    const data = await client.gql<{
      actor?: {
        entitySearch?: {
          count?: number;
          results?: { entities?: unknown[]; nextCursor?: string | null };
        };
      };
    }>(
      `query($query: String!, $cursor: String) {
        actor {
          entitySearch(query: $query) {
            count
            results(cursor: $cursor) {
              entities {
                guid name accountId
                ... on DashboardEntityOutline { createdAt updatedAt permissions }
                tags { key values }
              }
              nextCursor
            }
          }
        }
      }`,
      compact({ query: clauses.join(" AND "), cursor: p.cursor }),
    );

    const search = data?.actor?.entitySearch;
    const dashboards = search?.results?.entities ?? [];

    return {
      dashboards,
      count: dashboards.length,
      total: search?.count,
      cursor: search?.results?.nextCursor ?? undefined,
    };
  },
};

export default action;
