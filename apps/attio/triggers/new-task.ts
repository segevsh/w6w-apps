import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-tasks.ts";

const PINNED = new Set(["sort", "limit", "offset"]);

const trigger = pollFromListAction({
  key: "new-task",
  title: "New Task",
  description:
    "The run gets each newly created Attio task, optionally filtered by linked record, assignee or completion.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, sort: "created_at:desc", limit: 50 }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: { task_id?: string } }).id?.task_id),
  params: (action.params ?? []).filter((p) => !PINNED.has(p.key)),
  output: [
    { key: "id", type: "object", label: "Task ID ({ workspace_id, task_id })" },
    { key: "content_plaintext", type: "string", label: "Task text" },
    { key: "deadline_at", type: "string", label: "Deadline" },
    { key: "is_completed", type: "boolean", label: "Completed" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: { workspace_id: "w_1", task_id: "t_1" },
    content_plaintext: "Follow up with Acme",
    deadline_at: null,
    is_completed: false,
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});

export default trigger;
