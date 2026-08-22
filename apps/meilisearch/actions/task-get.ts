import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient, TERMINAL_TASK_STATES } from "../lib/client.ts";

/**
 * `GET /tasks/{taskUid}` — verified against Meilisearch's OpenAPI document
 * (`get_task`).
 *
 * **This is the other half of every write in this app.** Adding documents,
 * changing settings, creating an index — all of them return
 * `{taskUid, status: "enqueued"}` and nothing else. Whether the work actually
 * succeeded is only knowable here.
 *
 * The states are `enqueued`, `processing`, `succeeded`, `failed` and
 * `canceled`. The one worth designing around is **`failed`**: it is reached
 * without any HTTP error ever occurring, so a workflow that treats the write's
 * 200 as success is wrong every time a document is malformed or a filter names
 * a non-filterable attribute. `error` on the task carries the reason.
 */
const action: ActionDefinition = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get a task",
  description: "Find out whether an enqueued write actually succeeded.",
  params: [
    {
      key: "taskUid",
      label: "Task ID",
      type: "number",
      required: true,
      hint: "The `taskUid` a write returned.",
    },
  ],
  output: [
    { key: "uid", type: "number", label: "Task ID" },
    { key: "indexUid", type: "string", label: "Index" },
    {
      key: "status",
      type: "string",
      label: "enqueued, processing, succeeded, failed or canceled",
    },
    { key: "type", type: "string", label: "What kind of write it was" },
    { key: "error", type: "object", label: "Why it failed — set only when status is `failed`" },
    { key: "details", type: "object", label: "What it did (documents received, indexed, …)" },
    { key: "duration", type: "string", label: "How long it took" },
    { key: "enqueuedAt", type: "string", label: "Enqueued" },
    { key: "startedAt", type: "string", label: "Started" },
    { key: "finishedAt", type: "string", label: "Finished" },
    { key: "finished", type: "boolean", label: "Whether the task reached a terminal state" },
    { key: "succeeded", type: "boolean", label: "Whether it finished successfully" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uid = p.taskUid;
    if (uid === undefined || uid === null || String(uid).trim() === "") {
      throw new Error("`taskUid` is required");
    }
    const taskUid = Number(uid);
    if (!Number.isFinite(taskUid)) throw new Error("`taskUid` must be a number");

    ctx.log("info", "getting a Meilisearch task", { taskUid });

    const task = await new MeilisearchClient(ctx).request<{ status?: string }>(
      `/tasks/${encodeURIComponent(String(taskUid))}`,
    );
    // `status` alone forces every caller to know the vocabulary; these two
    // booleans are what a branch in a workflow actually tests.
    const status = String(task?.status ?? "");
    return {
      ...task,
      finished: (TERMINAL_TASK_STATES as readonly string[]).includes(status),
      succeeded: status === "succeeded",
    };
  },
};

export default action;
