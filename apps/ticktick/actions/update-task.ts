import type { ActionDefinition } from "@w6w/types";
import { encodeId, type TaskFields, taskPayload, TickTickClient } from "../lib/client.ts";
import { projectParam, taskFieldParams, taskOutput, taskParam } from "../lib/params.ts";

interface Input extends TaskFields {
  projectId: string;
  taskId: string;
}

/**
 * `POST /open/v1/task/{taskId}` — update a task.
 *
 * Three quirks, all of them TickTick's and all of them load-bearing:
 *
 *  1. **`POST`, not `PUT`/`PATCH`.** TickTick has no other update verb. (Its own
 *     doc still carries an `<a name="updateusingput">` anchor above this
 *     endpoint — a fossil of an earlier shape. The path and verb below are what
 *     the current document specifies.)
 *
 *  2. **The body must repeat the id.** `id` and `projectId` are both marked
 *     *required* in the request-body table, even though `taskId` is already in
 *     the path. This action sends `id` for you from the `taskId` param, so the
 *     two can never disagree.
 *
 *  3. **`projectId` is required even though you are not moving the task.** It is
 *     part of addressing a task, not a change of location — to actually move
 *     one, use **Move Task**.
 *
 * **The same honest uncertainty as Update Project:** TickTick does not document
 * whether this merges or replaces. Only fields the caller set are sent. If you
 * need certainty, Get Task first and pass everything back.
 *
 * `status` is deliberately not offered: completion has its own endpoint
 * (**Complete Task**), and writing the field through this body is not a
 * documented path.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Update a task's title, content, dates, tags, priority, reminders or subtasks. Sends only the fields you set. Use Complete Task to mark it done and Move Task to change project.",
  idempotent: true,
  params: [
    projectParam,
    taskParam,
    { key: "title", label: "Title", type: "string" },
    ...taskFieldParams(),
  ],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`/task/${encodeId(input.taskId)}`, {
      method: "POST",
      // `id` and `projectId` are documented as required body fields, in addition
      // to `taskId` in the path.
      body: { id: input.taskId, projectId: input.projectId, ...taskPayload(input) },
    });
  },
};

export default updateTask;
