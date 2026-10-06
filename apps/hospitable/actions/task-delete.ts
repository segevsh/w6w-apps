import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";

/** `DELETE /v2/tasks/{id}` — Delete a manual operations task. */
interface Input {
  id: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description:
    "Delete a manual operations task. Marketplace-backed tasks cannot be deleted. Needs task:write.",
  idempotent: true,
  params: [{ key: "id", label: "Task UUID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status when the vendor returns no body" }],

  execute(input, ctx) {
    return new HospitableClient(ctx).request("DELETE", `/tasks/${encodeId(input.id)}`);
  },
};

export default taskDelete;
