import type { ActionDefinition } from "@w6w/types";
import { type ListInput, type PagedResult, runList } from "../lib/client.ts";
import { listParams, pagedOutput } from "../lib/params.ts";

interface Input extends ListInput {
  itemType: string;
}

const TYPES = ["user", "group", "application", "servicePrincipal"] as const;

/**
 * `GET /directory/deletedItems/microsoft.graph.{type}`
 *
 * https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-list?view=graph-rest-1.0
 *
 * The soft-deleted objects of one type. **The type is part of the URI and mandatory** — a bare
 * `GET /directory/deletedItems` is unsupported — so it is a required field. A deleted item stays
 * here for up to 30 days and is then permanently deleted. Needs the read permission of the chosen
 * type (`User.Read.All`, `Group.Read.All`, `Application.Read.All`). Page size defaults to 100, max
 * 999. `$orderby` works on `deletedDateTime`, `displayName` and `userPrincipalName`; ordering by
 * `deletedDateTime` needs Advanced query. A deleted security group reports `securityEnabled:
 * false` (a documented limitation) — read `groupTypes` instead.
 */
const listDeletedItems: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-deleted-items",
  type: "read",
  resource: "deleted-item",
  title: "List Deleted Items",
  description: "List recently deleted users, groups, applications or service principals.",
  params: [
    {
      key: "itemType",
      label: "Item type",
      type: "select",
      required: true,
      default: "user",
      options: [
        { value: "user", label: "Users" },
        { value: "group", label: "Groups" },
        { value: "application", label: "Applications" },
        { value: "servicePrincipal", label: "Service principals" },
      ],
    },
    ...listParams({
      filterHint: "OData `$filter`, e.g. `startswith(displayName,'Ad')`.",
    }),
  ],
  output: pagedOutput("Deleted items"),

  execute(input, ctx) {
    const type = TYPES.find((t) => t === input.itemType) ?? "user";
    return runList(ctx, `/directory/deletedItems/microsoft.graph.${type}`, input);
  },
};

export default listDeletedItems;
