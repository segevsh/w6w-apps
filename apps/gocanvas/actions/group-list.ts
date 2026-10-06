import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { departmentIdParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  departmentId?: number;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List Groups",
  description: "List groups, optionally for one department.",
  params: [
    pageParam,
    departmentIdParam,
  ],
  output: [
    { key: "items", type: "array", label: "Groups on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/groups", {
      page: input.page,
      department_id: input.departmentId,
    });
  },
};

export default groupList;
