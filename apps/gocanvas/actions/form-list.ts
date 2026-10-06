import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  assigned?: boolean;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "read",
  resource: "form",
  title: "List Forms",
  description:
    "List the forms the user can access. Managers see every form they can manage; everyone else only their assigned forms.",
  params: [
    pageParam,
    {
      key: "assigned",
      label: "Assigned only",
      type: "boolean",
      hint: "For form managers: return only their assigned, active forms.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Forms on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/forms", { page: input.page, assigned: input.assigned });
  },
};

export default formList;
