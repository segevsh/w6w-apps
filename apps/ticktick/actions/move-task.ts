import type { ActionDefinition, OutputField } from "@w6w/types";
import { TickTickClient } from "../lib/client.ts";
import { taskParam } from "../lib/params.ts";

interface Input {
  taskId: string;
  fromProjectId: string;
  toProjectId: string;
}

/**
 * `POST /open/v1/task/move` — move a task between projects.
 *
 * The request body is a **JSON array** of `{ fromProjectId, toProjectId,
 * taskId }` triples, and the response a matching array of `{ id, etag }`. The
 * endpoint is therefore a batch endpoint.
 *
 * This action exposes the **single-task** form deliberately, sending a
 * one-element array. Same reasoning the sibling `microsoft-todo` App applied to
 * inline linked resources: a batch parameter would be one opaque JSON blob in
 * the editor, whereas one move per node keeps the operation visible in the
 * workflow graph — and a partial failure inside a batch has no per-item error
 * contract documented, so there would be nothing honest to report about which
 * elements succeeded.
 *
 * `fromProjectId` is required by the endpoint even though the task's current
 * project is knowable server-side. It is not decoration: get it wrong and the
 * move does not describe a task TickTick can find.
 *
 * The `etag` in the response is the only place an etag appears in this API's
 * write surface, and TickTick documents no conditional-request header that
 * consumes it. It is returned as-is.
 *
 * Idempotent: moving a task that is already in the target project leaves the
 * same world — though the second call's `fromProjectId` will no longer match,
 * so a retry should use the *new* source.
 */
const output: OutputField[] = [
  { key: "items", type: "array", label: "Move results ({ id, etag })" },
  { key: "count", type: "number", label: "Count" },
];

const moveTask: ActionDefinition<Input, { items: unknown[]; count: number }> = {
  key: "move-task",
  type: "perform",
  resource: "task",
  title: "Move Task",
  description:
    "Move one task from one project to another. TickTick's endpoint is a batch; this action sends a single move so the operation stays visible in the graph.",
  idempotent: true,
  params: [
    taskParam,
    {
      key: "fromProjectId",
      label: "From project",
      type: "string",
      required: true,
      placeholder: "69a850ef1c20d2030e148fdd",
      hint: "The task's current project id. Required by TickTick, and it must be correct.",
    },
    {
      key: "toProjectId",
      label: "To project",
      type: "string",
      required: true,
      placeholder: "69a850f41c20d2030e148fdf",
      hint: "The destination project id.",
    },
  ],
  output,

  async execute(input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/task/move", {
      method: "POST",
      body: [{
        fromProjectId: input.fromProjectId,
        toProjectId: input.toProjectId,
        taskId: input.taskId,
      }],
    });
    return { items, count: items.length };
  },
};

export default moveTask;
