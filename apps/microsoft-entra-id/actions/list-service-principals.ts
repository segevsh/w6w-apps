import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList } from "../lib/client.ts";
import { listParams, pagedOutput } from "../lib/params.ts";

/**
 * `GET /servicePrincipals`
 *
 * https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0
 *
 * The enterprise applications (service principals) in the tenant — the instance of an app that
 * holds permission grants and role assignments. Needs `Application.Read.All`. Unlike the other
 * directory lists, the reference gives the default **and maximum** page size as 100, not 999, so
 * the `top` field is capped at 100 here. `$orderby` combined with `$filter` needs Advanced query.
 */
const listServicePrincipals: ActionDefinition<ListInput, PagedResult<Record<string, unknown>>> = {
  key: "list-service-principals",
  type: "search",
  resource: "service-principal",
  title: "List Service Principals",
  description: "List or search the service principals (enterprise applications) in the tenant.",
  params: listParams({
    filterHint:
      "OData `$filter`, e.g. `appId eq '00000003-0000-0000-c000-000000000000'` or `startswith(displayName,'Contoso')`. Using `$orderby` with `$filter` needs Advanced query.",
  }).map((p) =>
    p.key === "top"
      ? {
        ...p,
        default: 100,
        validation: { integer: true, min: 1, max: 100 },
        hint: "OData `$top` — results per request, 1 to 100 (the documented maximum here).",
      }
      : p
  ),
  output: pagedOutput("Service principals"),

  execute(input, ctx) {
    return runList(ctx, "/servicePrincipals", input);
  },
};

export default listServicePrincipals;
