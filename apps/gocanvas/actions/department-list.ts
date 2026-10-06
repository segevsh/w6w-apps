import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";

type Input = Record<string, never>;

const departmentList: ActionDefinition<Input> = {
  key: "department-list",
  type: "read",
  resource: "department",
  title: "List Departments",
  description: "List the company's departments.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Departments" },
  ],

  execute(_input, ctx) {
    return new GoCanvasClient(ctx).request("/departments");
  },
};

export default departmentList;
