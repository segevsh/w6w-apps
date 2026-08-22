import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/projects/` — the dbt projects in the account.
 *
 * A project is one dbt repository with its environments and jobs, so this is
 * the first call in almost any exploration: it maps the names people say out
 * loud to the ids the rest of the API wants.
 *
 * v3 rather than v2 — projects exist in both, and v3 is the version dbt
 * maintains.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description:
    "The dbt projects in the account — one repository each, and the map from names people say " +
    "to the ids the API wants.",
  params: [
    {
      key: "nameContains",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Case-insensitive substring.",
    },
    {
      key: "includeRelated",
      label: "Include Related",
      type: "string",
      default: "",
      advanced: true,
      hint: "e.g. `repository`, `connection`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Projects returned" },
    { key: "totalCount", type: "number", label: "Projects in the account" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const { items, totalCount } = await client.requestAll(
      `/api/v3/accounts/${client.accountId}/projects/`,
      {
        query: query({
          name__icontains: p.nameContains,
          include_related: p.includeRelated,
        }),
      },
      want,
    );
    return { projects: items, count: items.length, totalCount };
  },
};

export default action;
