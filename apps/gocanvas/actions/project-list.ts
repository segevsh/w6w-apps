import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description:
    "List the projects of a department the user can access (Project Management View only).",
  params: [
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Projects on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/projects", { page: input.page });
  },
};

export default projectList;
