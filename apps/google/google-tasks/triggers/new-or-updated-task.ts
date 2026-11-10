import type { TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import listTasks from "../actions/list-tasks.ts";

const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
/** Five pages bound one check; a larger window resumes from its page token next check (brief 9.8). */
const MAX_PAGES = 5;
type Task = { id?: string; updated?: string };
export const clock = { now: (): number => Date.now() };

const trigger: TriggerDefinition<{ taskList: string }> = {
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description: "The run gets each task created or updated since the previous check.",
  params: [{ key: "taskList", label: "Task list ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "updated", type: "string", label: "Updated" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "task_123",
    title: "Prepare report",
    updated: "2026-11-09T09:00:00Z",
    status: "needsAction",
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return pollWindow<Task, string>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: 1000,
      idOf: (task) => `${task.id ?? ""}:${task.updated ?? ""}`,
      tsOf: (task) => {
        const ms = Date.parse(String(task.updated ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, pageToken) {
        const result = await listTasks.execute({
          taskList: params.taskList,
          updatedMin: new Date(since).toISOString(),
          maxResults: PAGE_SIZE,
          pageToken,
        }, ctx) as { items?: Task[]; nextPageToken?: string };
        return { items: result.items ?? [], next: result.nextPageToken || undefined };
      },
    });
  },
};

export default trigger;
