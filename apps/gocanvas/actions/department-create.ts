import type { ActionDefinition } from "@w6w/types";
import { compact, GoCanvasClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
}

const departmentCreate: ActionDefinition<Input> = {
  key: "department-create",
  type: "perform",
  resource: "department",
  title: "Create Department",
  description: "Create a department with a name and optional description.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "data", type: "object", label: "The created department" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request("/departments", {
      method: "POST",
      body: compact({ name: input.name, description: input.description }),
    });
  },
};

export default departmentCreate;
