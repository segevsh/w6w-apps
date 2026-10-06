import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { continuationParams, pagedOutput, selectParam } from "../lib/params.ts";

interface Input {
  filter?: string;
  select?: string[];
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /directoryRoles`
 *
 * https://learn.microsoft.com/en-us/graph/api/directoryrole-list?view=graph-rest-1.0
 *
 * **Only activated roles.** Graph lists the roles that an admin has activated in the tenant; "not
 * all built-in roles are initially activated", so a role you expect (say Helpdesk Administrator)
 * can be missing simply because nobody has used it yet. The full catalogue of built-in roles is
 * `directoryRoleTemplates`, which is not covered here. Needs `RoleManagement.Read.Directory`, and
 * in a delegated context the caller needs a directory role such as Directory Readers or Global
 * Reader. The reference supports `$select`, `$expand` and `$filter` (**`eq` only**); no `$top`.
 */
const listDirectoryRoles: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-directory-roles",
  type: "read",
  resource: "directory-role",
  title: "List Directory Roles",
  description: "List the directory roles that are activated in the tenant.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      hint: "OData `$filter` — `eq` only, e.g. `displayName eq 'User Administrator'`.",
    },
    selectParam(),
    ...continuationParams(),
  ],
  output: pagedOutput("Directory roles"),

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const replay = input.nextLink?.trim();
    const options = replay ? {} : {
      query: { $filter: input.filter?.trim(), $select: odataList(input.select) },
    };
    const target = replay || "/directoryRoles";
    return input.all
      ? client.collect(target, options, input.maxPages ?? 10)
      : client.page(target, options);
  },
};

export default listDirectoryRoles;
