import type { ActionDefinition } from "@w6w/types";
import { entraError, GraphClient, odataList, type PagedResult, seg } from "../lib/client.ts";
import { continuationParams, pagedOutput, selectParam } from "../lib/params.ts";

interface Input {
  roleId: string;
  idType?: string;
  select?: string[];
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /directoryRoles/{role-id}/members` or
 * `GET /directoryRoles(roleTemplateId='{roleTemplateId}')/members`
 *
 * https://learn.microsoft.com/en-us/graph/api/directoryrole-list-members?view=graph-rest-1.0
 *
 * The users and service principals assigned a directory role, as `directoryObject`s. The reference
 * lets you address the role by either its object id or its **role template id** — the latter is
 * stable across tenants (the Global Administrator template id is the same everywhere), where the
 * object id is per-tenant. Supports only `$select`; it "returns a default of 1,000 objects and
 * doesn't support pagination using `$top`". Needs `RoleManagement.Read.Directory`. A role that was
 * never activated is not addressable here (see List Directory Roles).
 */
const listDirectoryRoleMembers: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-directory-role-members",
  type: "read",
  resource: "directory-role",
  title: "List Directory Role Members",
  description: "List the users and service principals assigned a directory role.",
  params: [
    {
      key: "roleId",
      label: "Role",
      type: "string",
      required: true,
      hint: "The directory role's object id (List Directory Roles) or its role template id.",
    },
    {
      key: "idType",
      label: "Id type",
      type: "select",
      default: "id",
      options: [
        { value: "id", label: "Role object id" },
        { value: "roleTemplateId", label: "Role template id" },
      ],
    },
    selectParam(),
    ...continuationParams(),
  ],
  output: pagedOutput("Members"),

  execute(input, ctx) {
    const role = (input.roleId ?? "").trim();
    if (!role && !input.nextLink?.trim()) throw new Error(entraError("Role is required."));
    const client = new GraphClient(ctx);
    const replay = input.nextLink?.trim();
    const options = replay ? {} : { query: { $select: odataList(input.select) } };
    const target = replay ||
      (input.idType === "roleTemplateId"
        ? `/directoryRoles(roleTemplateId='${role.replaceAll("'", "''")}')/members`
        : `/directoryRoles/${seg(role)}/members`);
    return input.all
      ? client.collect(target, options, input.maxPages ?? 10)
      : client.page(target, options);
  },
};

export default listDirectoryRoleMembers;
