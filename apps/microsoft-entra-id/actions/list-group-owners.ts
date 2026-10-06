import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList, seg } from "../lib/client.ts";
import { groupIdParam, listParams, pagedOutput } from "../lib/params.ts";

interface Input extends ListInput {
  groupId: string;
}

/**
 * `GET /groups/{id}/owners`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-list-owners?view=graph-rest-1.0
 *
 * The group's owners as `directoryObject`s (users, and service principals where present). Needs
 * `GroupMember.Read.All`; this App's `Group.ReadWrite.All` is listed as sufficient. As with
 * members, Graph states that query parameters other than `$expand` need Advanced query.
 */
const listGroupOwners: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-group-owners",
  type: "read",
  resource: "group-owner",
  title: "List Group Owners",
  description: "List the owners of a group.",
  params: [
    groupIdParam,
    ...listParams({
      orderby: false,
      filterHint: "OData `$filter`, e.g. `startswith(displayName,'A')`. Needs Advanced query.",
    }),
  ],
  output: pagedOutput("Owners"),

  execute(input, ctx) {
    return runList(ctx, `/groups/${seg(input.groupId)}/owners`, input);
  },
};

export default listGroupOwners;
