import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /resource-planner/assignments/{assignmentId}` — Delete a resource-planner assignment.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  assignmentId: number;
}

const assignmentDelete: ActionDefinition<Input> = {
  key: "assignment-delete",
  type: "perform",
  resource: "assignment",
  title: "Delete Assignment",
  description: "Delete a resource-planner assignment.",
  idempotent: true,
  params: [
    {
      key: "assignmentId",
      label: "Assignment ID",
      type: "number",
      required: true,
      hint: "Numeric assignment id (from List Assignments).",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/resource-planner/assignments/${encodeId(input.assignmentId)}`,
      { method: "DELETE" },
    );
  },
};

export default assignmentDelete;
