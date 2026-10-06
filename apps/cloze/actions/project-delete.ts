import type { ActionDefinition } from "@w6w/types";
import { deleteParams, deleteRecord, PROJECT } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Delete a project. This cannot be undone.",
  idempotent: true,
  params: deleteParams(PROJECT),
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "ID deleted" },
  ],

  execute(input, ctx) {
    return deleteRecord(ctx, PROJECT, input);
  },
};

export default projectDelete;
