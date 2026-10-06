import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList } from "../lib/client.ts";
import { listParams, pagedOutput } from "../lib/params.ts";

/**
 * `GET /groups`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0
 *
 * Least privileged delegated scope: `Group.ReadBasic.All`; this App requests
 * `Group.ReadWrite.All`, which the reference lists as sufficient. `$skip` is not supported.
 * `$search` tokenizes only `displayName` and `description`; other fields behave as a
 * `startswith` filter. Type filters from the reference:
 *
 *   - Microsoft 365 groups: `groupTypes/any(c:c eq 'Unified')`
 *   - Security groups: `mailEnabled eq false and securityEnabled eq true`
 *   - Mail-enabled security / distribution groups need `NOT groupTypes/any(c:c eq 'Unified')` and
 *     therefore Advanced query.
 */
const listGroups: ActionDefinition<ListInput, PagedResult<Record<string, unknown>>> = {
  key: "list-groups",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List or search the groups in the directory.",
  params: listParams({
    filterHint:
      "OData `$filter`, e.g. `groupTypes/any(c:c eq 'Unified')` for Microsoft 365 groups or `mailEnabled eq false and securityEnabled eq true` for security groups.",
  }),
  output: pagedOutput("Groups"),

  execute(input, ctx) {
    return runList(ctx, "/groups", input);
  },
};

export default listGroups;
