import type { ActionDefinition } from "@w6w/types";
import { HexClient, type HexCursorPage, toList } from "../lib/client.ts";
import { CURSOR_OUTPUT, type CursorInput, cursorParams } from "../lib/params.ts";

/** `GET /v1/users` — workspace members (page size up to 500, the largest of any Hex list). */
interface Input extends CursorInput {
  groupId?: string;
  userIds?: string[] | string;
  sortBy?: string;
  sortDirection?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List workspace users, optionally restricted to a group or a set of user ids.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", hint: "Only members of this group." },
    { key: "userIds", label: "User IDs", type: "string", hint: "Comma-separated user ids." },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [{ value: "NAME", label: "Name" }, { value: "EMAIL", label: "Email" }],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
    ...cursorParams(500),
  ],
  output: [...CURSOR_OUTPUT],

  execute(input, ctx) {
    return new HexClient(ctx).json<HexCursorPage<unknown>>("/users", {
      query: {
        groupId: input.groupId,
        userIds: toList(input.userIds),
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
        limit: input.limit,
        after: input.after,
      },
    });
  },
};

export default userList;
