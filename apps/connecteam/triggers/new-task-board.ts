import { snapshotTrigger } from "../lib/triggers.ts";
import taskboardList from "../actions/taskboard-list.ts";

/**
 * Bounded collection (brief 9.1 c): `GET /tasks/v1/taskboards` answers the account's whole task boards in one
 * unpaginated response (https://developer.connecteam.com/openapi/connecteam-api-documentation.json
 * , verified 2026-11-10); the kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-task-board",
  title: "New Task Board",
  description: "The run gets each task board newly created in the Connecteam account.",
  output: [
    { key: "id", type: "number", label: "Task board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isArchived", type: "boolean", label: "Archived" },
  ],
  sample: { id: 201, name: "Store tasks", isArchived: false },
  fetchRows: async (_params, ctx) => {
    const out = await taskboardList.execute({}, ctx) as { taskBoards?: unknown[] };
    return out.taskBoards ?? [];
  },
  idOf: (row) => (row as { id?: unknown }).id,
});
