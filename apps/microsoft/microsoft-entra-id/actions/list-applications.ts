import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList } from "../lib/client.ts";
import { listParams, pagedOutput } from "../lib/params.ts";

/**
 * `GET /applications`
 *
 * https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0
 *
 * The app **registrations** in the tenant (the global definition of an app), as opposed to
 * service principals, which are the per-tenant instances (see List Service Principals). Needs
 * `Application.Read.All`. Default page size 100, maximum 999; `$skip` is not supported. Key
 * material (`keyCredentials`) is only returned when named in `$select`, and selecting it is
 * throttled to 150 requests per minute per tenant.
 */
const listApplications: ActionDefinition<ListInput, PagedResult<Record<string, unknown>>> = {
  key: "list-applications",
  type: "search",
  resource: "application",
  title: "List Applications",
  description: "List or search the app registrations in the tenant.",
  params: listParams({
    filterHint:
      "OData `$filter`, e.g. `startswith(displayName,'Contoso')`. `ne`, `not` and `endsWith` need Advanced query.",
  }),
  output: pagedOutput("Applications"),

  execute(input, ctx) {
    return runList(ctx, "/applications", input);
  },
};

export default listApplications;
