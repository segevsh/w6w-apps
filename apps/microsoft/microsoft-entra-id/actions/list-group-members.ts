import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList, seg } from "../lib/client.ts";
import { groupIdParam, listParams, pagedOutput } from "../lib/params.ts";

interface Input extends ListInput {
  groupId: string;
  memberType?: string;
}

/** The OData cast segments the reference documents for `/members`. */
const CASTS: Record<string, string> = {
  user: "microsoft.graph.user",
  group: "microsoft.graph.group",
  device: "microsoft.graph.device",
  servicePrincipal: "microsoft.graph.servicePrincipal",
  orgContact: "microsoft.graph.orgContact",
};

/**
 * `GET /groups/{id}/members` (optionally `/members/microsoft.graph.user`, …)
 *
 * https://learn.microsoft.com/en-us/graph/api/group-list-members?view=graph-rest-1.0
 *
 * Direct members only, as `directoryObject`s — check `@odata.type`. Least privileged scope
 * `GroupMember.ReadBasic.All`; this App's `Group.ReadWrite.All` is listed as sufficient. Notes
 * from the reference:
 *
 *   - Graph states that query parameters on this API, except `$expand`, are supported **only with
 *     Advanced query** (`ConsistencyLevel: eventual` + `$count`); the OData cast always needs it,
 *     so choosing a member type switches it on.
 *   - A cast to a type the group cannot hold is `400 Request_UnsupportedQuery` (for example
 *     `microsoft.graph.group` on a Microsoft 365 group, which cannot contain groups).
 *   - A property the caller has no permission to read comes back `null`; only `@odata.type` and
 *     `id` are guaranteed.
 *   - Groups with hidden membership additionally need `Member.Read.Hidden`.
 */
const listGroupMembers: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-group-members",
  type: "read",
  resource: "group-member",
  title: "List Group Members",
  description: "List the direct members of a group, optionally only one member type.",
  params: [
    groupIdParam,
    {
      key: "memberType",
      label: "Member type",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "user", label: "Users" },
        { value: "group", label: "Groups" },
        { value: "device", label: "Devices" },
        { value: "servicePrincipal", label: "Service principals" },
        { value: "orgContact", label: "Organizational contacts" },
      ],
      hint: "Restricts the result with an OData cast. Switches Advanced query on.",
    },
    ...listParams({
      orderby: false,
      filterHint:
        "OData `$filter`, e.g. `startswith(displayName,'A')`. Needs Advanced query (switched on for you only by Search and Member type).",
    }),
  ],
  output: pagedOutput("Members"),

  execute(input, ctx) {
    const cast = CASTS[input.memberType ?? "all"];
    return runList(
      ctx,
      `/groups/${seg(input.groupId)}/members${cast ? `/${cast}` : ""}`,
      { ...input, advancedQuery: input.advancedQuery || Boolean(cast) },
    );
  },
};

export default listGroupMembers;
