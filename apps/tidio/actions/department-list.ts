import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/** `GET /departments` (not paginated). */
const departmentList: ActionDefinition<Record<string, never>> = {
  key: "department-list",
  type: "read",
  resource: "department",
  title: "List Departments",
  description: "List all departments (operator teams) with their IDs.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Departments [{id, name}]" },
    { key: "count", type: "number", label: "Number of departments" },
  ],
  async execute(_input, ctx) {
    const body = await call(ctx, "GET", "/departments") as { departments?: unknown[] } | null;
    const items = body?.departments ?? [];
    return { items, count: items.length };
  },
};

export default departmentList;
