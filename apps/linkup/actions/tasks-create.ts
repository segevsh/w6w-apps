import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";
import { jsonValue } from "../lib/params.ts";

interface Input {
  tasks: unknown;
}

const TYPES = ["search", "fetch", "research", "extract"];

const tasksCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "tasks-create",
  type: "perform",
  idempotent: false,
  resource: "tasks",
  title: "Create Tasks",
  description:
    "Submit a batch of 1 to 100 asynchronous search, fetch, research or extract tasks in one call. " +
    "Each is { type, input } with the same input as the synchronous endpoint. Poll with Get Task.",
  params: [
    {
      key: "tasks",
      label: "Tasks (JSON array)",
      type: "json",
      required: true,
      hint:
        'e.g. [{"type":"search","input":{"q":"…","depth":"standard","outputType":"sourcedAnswer"}}]',
    },
  ],
  output: [
    { key: "tasks", type: "array", label: "The created tasks, each with its id and status" },
    { key: "ids", type: "array", label: "Task ids, in submission order" },
  ],

  async execute(input, ctx) {
    const tasks = jsonValue(input.tasks, "Tasks");
    if (!Array.isArray(tasks) || tasks.length < 1 || tasks.length > 100) {
      throw new Error("Tasks must be a JSON array of 1 to 100 tasks");
    }
    tasks.forEach((t, i) => {
      const task = t as { type?: string; input?: unknown };
      if (!task || !TYPES.includes(task.type ?? "")) {
        throw new Error(`Task ${i + 1}: type must be one of ${TYPES.join(", ")}`);
      }
      if (!task.input || typeof task.input !== "object") {
        throw new Error(`Task ${i + 1}: input must be an object`);
      }
    });
    const created = await new LinkupClient(ctx).post<Array<{ id?: string }>>("/v1/tasks", tasks);
    const list = Array.isArray(created) ? created : [];
    return { tasks: list, ids: list.map((t) => t.id) };
  },
};

export default tasksCreate;
