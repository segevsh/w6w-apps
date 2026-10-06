import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";

/** `GET /v2/tasks/{id}` — One task. */
interface Input {
  id: string;
  include?: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get an operations task by UUID, optionally with its checklist and photos.",
  params: [
    { key: "id", label: "Task UUID", type: "string", required: true },
    includeParam("marketplace, checklist, photos"),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", `/tasks/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default taskGet;
