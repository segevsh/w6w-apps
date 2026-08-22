import type { ActionDefinition } from "@w6w/types";
import { flattenAll, pagination, query, TerraformClient } from "../lib/client.ts";

/**
 * `GET /api/v2/organizations` — the organisations this token can see.
 *
 * An organisation is the billing and ownership boundary: workspaces, teams,
 * variable sets and policies all live inside one, and nothing crosses between
 * them. Almost every other path in this API starts with an organisation name,
 * so this is usually the first call a workflow makes.
 *
 * The name is the identifier — there is no separate id to store. Renaming an
 * organisation therefore breaks every stored path, which is why HashiCorp
 * makes it deliberately awkward in the interface.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description:
    "The organisations this token can see. The NAME is the identifier — every other path starts " +
    "with it, and there is no separate id.",
  params: [
    { key: "pageSize", label: "Page Size", type: "number", default: 20 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "organizations", type: "array", label: "The organisations" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "names", type: "array", label: "Just the names, which are the ids" },
    { key: "totalCount", type: "number", label: "Across all pages" },
    { key: "nextPage", type: "number", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const document = await new TerraformClient(ctx).request("/api/v2/organizations", {
      query: query({
        "page[size]": Math.min(100, Math.max(1, Number(p.pageSize ?? 20))),
        "page[number]": Math.max(1, Number(p.page ?? 1)),
      }),
    });

    const organizations = flattenAll(document.data as never);
    const page = pagination(document.meta);

    return {
      organizations,
      count: organizations.length,
      names: organizations.map((org) => org["name"]).filter(Boolean),
      totalCount: page.totalCount,
      nextPage: page.nextPage,
    };
  },
};

export default action;
