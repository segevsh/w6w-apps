import type { ActionDefinition } from "@w6w/types";
import { type TaskFields, taskPayload, TickTickClient } from "../lib/client.ts";
import { projectParam, taskFieldParams, taskOutput } from "../lib/params.ts";

interface Input extends TaskFields {
  projectId: string;
  title: string;
}

/**
 * `POST /open/v1/task` — create a task.
 *
 * Note the path: this one is **not** nested under the project. `projectId` is a
 * required *body* field instead, which is the reverse of every other task
 * endpoint in the API. It is required either way — there is no inbox-by-default
 * create.
 *
 * `title` and `projectId` are the two required fields; everything else is
 * optional and TickTick fills its own defaults, so a minimal call sends a
 * two-field body.
 *
 * Dates are converted to TickTick's `yyyy-MM-ddTHH:mm:ss+0000` form on the way
 * out — see `ticktickDate()` for why that is not what JavaScript emits.
 *
 * TickTick mints a fresh id per call, so a retry creates a duplicate task:
 * `idempotent: false`.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a task in a project. Title and project are required; subtasks, tags, reminders and a repeat rule can all be set in the same call.",
  idempotent: false,
  params: [
    projectParam,
    { key: "title", label: "Title", type: "string", required: true },
    ...taskFieldParams(),
  ],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request("/task", {
      method: "POST",
      // projectId is a body field here, not a path segment — unlike every
      // other task endpoint.
      body: { projectId: input.projectId, ...taskPayload(input) },
    });
  },
};

export default createTask;
