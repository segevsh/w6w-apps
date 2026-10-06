import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  enabled?: boolean;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the company's users, optionally only enabled or only disabled ones.",
  params: [
    pageParam,
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "On: only enabled users. Off: only disabled users. Leave unset for all users.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Users on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/users", { page: input.page, enabled: input.enabled });
  },
};

export default userList;
