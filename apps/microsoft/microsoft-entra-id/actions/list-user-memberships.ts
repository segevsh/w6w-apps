import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList, userPath } from "../lib/client.ts";
import { listParams, pagedOutput, userIdParam } from "../lib/params.ts";

interface Input extends ListInput {
  userId: string;
}

/**
 * `GET /users/{id | userPrincipalName}/memberOf`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-memberof?view=graph-rest-1.0
 *
 * The groups, directory roles and administrative units the user is a **direct** member of, as
 * `directoryObject`s — check each item's `@odata.type`. Needs `User.Read.All` (or
 * `Directory.Read.All`, which this App requests). `$filter` and `$search` on this collection need
 * Advanced query (`$search` turns it on by itself). OData cast works: appending
 * `/microsoft.graph.group` would return only groups, but is not exposed here — filter the result
 * by `@odata.type` instead. Transitive membership (`transitiveMemberOf`) is not covered.
 */
const listUserMemberships: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-user-memberships",
  type: "read",
  resource: "user",
  title: "List User Memberships",
  description: "List the groups and directory roles a user is a direct member of.",
  params: [
    userIdParam,
    ...listParams({
      top: false,
      orderby: false,
      filterHint:
        "OData `$filter`, e.g. `displayName eq 'Sales'`. Filtering this collection needs Advanced query.",
    }),
  ],
  output: pagedOutput("Memberships"),

  execute(input, ctx) {
    return runList(ctx, `${userPath(input.userId)}/memberOf`, input);
  },
};

export default listUserMemberships;
