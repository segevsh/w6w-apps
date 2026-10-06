import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient, toList } from "../lib/client.ts";
import { expandParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/users` */
interface Input {
  onlyAssignable?: boolean;
  email?: string;
  expand?: string;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List users, optionally only those a work order can be assigned to, or by email.",
  params: [
    {
      key: "onlyAssignable",
      label: "Only assignable users",
      type: "boolean",
      hint: "Off by default, matching the API.",
    },
    { key: "email", label: "Emails", type: "string", hint: "Comma-separated." },
    expandParam(["role", "extra_fields"]),
    ...paginationParams,
    organizationIdParam,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list("/users", "users", {
      onlyAssignable: input.onlyAssignable === true ? true : undefined,
      email: toList(input.email),
      expand: toList(input.expand),
      limit: input.limit,
      cursor: input.cursor,
    }, input.organizationId);
  },
};

export default userList;
