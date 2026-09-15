import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery } from "../lib/client.ts";

interface Input {
  orderBy?: "id" | "name";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "Fetch a page of projects (pr_project).",
  params: [
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "name", label: "Name" },
      ],
      default: "id",
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 2000." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).list("/2.0/pr_project", listQuery(input));
  },
};

export default projectList;
