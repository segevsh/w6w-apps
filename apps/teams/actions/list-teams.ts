import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type PagedResult } from "../lib/client.ts";
import { continuationParams, pagedOutput } from "../lib/params.ts";

interface Input {
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/joinedTeams`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0
 *
 * The teams the signed-in user is a *direct* member of. Requires
 * `Team.ReadBasic.All`.
 *
 * Two documented quirks worth knowing, both surfaced in the param hints:
 *
 *  - **No OData at all.** The reference is explicit: "This method doesn't
 *    currently support the OData query parameters to customize the response."
 *    So there is no `$select`, no `$filter` and no `$top` here — only the
 *    `@odata.nextLink` continuation, which every collection carries.
 *  - **Most properties come back `null`.** Only `id`, `displayName`,
 *    `description`, `isArchived` and `tenantId` are populated; everything else
 *    needs `Get Team`.
 *
 * It also omits the *host* teams of shared channels the user can reach — those
 * live behind `GET /me/teamwork/associatedTeams`, which is not implemented here.
 */
const listTeams: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-teams",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List the teams the signed-in user is a direct member of.",
  params: [...continuationParams()],
  output: pagedOutput("Teams"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const target = input.nextLink ?? "/me/joinedTeams";
    return input.all ? client.collect(target, {}, input.maxPages ?? 10) : client.page(target, {});
  },
};

export default listTeams;
