import { collectPages, snapshotTrigger } from "../lib/triggers.ts";
import taskList from "../actions/task-list.ts";

/**
 * Bounded collection (brief 9.1 c): the PUBLISHED tasks of one task board, walked to its end
 * through `limit` (max 100) and `offset` on `GET /tasks/v1/taskboards/{taskBoardId}/tasks` with
 * `status=published` (`draft/published/completed/all`). The endpoint documents no sort order and no
 * created-since filter, so the open work of a board is compared check to check; completed and
 * draft tasks stay out, which keeps the list the size of the board's open work. The kit refuses
 * more than 5000 rows. https://developer.connecteam.com/openapi/connecteam-api-documentation.json
 * (verified 2026-11-10).
 */
export default snapshotTrigger<{ taskBoardId?: string }>({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly published on one Connecteam task board.",
  params: [{
    key: "taskBoardId",
    label: "Task board ID",
    type: "string",
    required: true,
    hint: "The task board to watch, e.g. from a taskboard-list result.",
  }],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "userIds", type: "array", label: "Assigned user IDs" },
    { key: "dueDate", type: "number", label: "Due date (Unix seconds)" },
  ],
  sample: {
    id: "task_81c2",
    title: "Restock aisle 4",
    status: "published",
    userIds: [9001],
    dueDate: 1762766400,
  },
  fetchRows: (params, ctx) => {
    const taskBoardId = params.taskBoardId?.trim();
    if (!taskBoardId) throw new Error("Set Task board ID to the board to watch.");
    return collectPages(100, async (offset, limit) => {
      const out = await taskList.execute(
        { taskBoardId, status: "published", limit, offset },
        ctx,
      ) as {
        tasks?: unknown[];
      };
      return out.tasks ?? [];
    });
  },
  idOf: (row) => (row as { id?: unknown }).id,
});
