import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList } from "../lib/client.ts";
import { listParams, pagedOutput } from "../lib/params.ts";

/**
 * `GET /users`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0
 *
 * Least privileged delegated scope: `User.ReadBasic.All` (basic properties only); this App
 * requests `User.ReadWrite.All`, which the reference lists as sufficient. Guests cannot call it.
 *
 * Quirks from the reference: `$skip` is not supported (use `nextLink`); only a default property
 * set comes back (`displayName`, `givenName`, `id`, `jobTitle`, `mail`, `mobilePhone`,
 * `officeLocation`, `preferredLanguage`, `surname`, `userPrincipalName`) unless `$select` names
 * more; and the list may lag users created, updated or deleted a moment ago (eventual
 * consistency). When `signInActivity` is selected or filtered the maximum page size drops to 500.
 */
const listUsers: ActionDefinition<ListInput, PagedResult<Record<string, unknown>>> = {
  key: "list-users",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List or search the users in the directory.",
  params: listParams({
    filterHint:
      "OData `$filter`, e.g. `startswith(displayName,'Ad')` or `accountEnabled eq true`. `ne`, `not`, `endsWith` and filters on several properties need Advanced query.",
  }),
  output: pagedOutput("Users"),

  execute(input, ctx) {
    return runList(ctx, "/users", input);
  },
};

export default listUsers;
