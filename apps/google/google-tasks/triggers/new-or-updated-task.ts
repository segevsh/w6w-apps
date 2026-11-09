import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listTasks from "../actions/list-tasks.ts";

const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
export const clock = { now: (): number => Date.now() };

interface State {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

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
  async poll({ params, state }, ctx) {
    const now = clock.now();
    const prior = state as { cursor?: unknown } | null;
    const cursor = typeof prior?.cursor === "number" ? prior.cursor : now;
    const { events, nextState } = await pollNewItems<{ id?: string; updated?: string }>({
      state,
      maxPages: 1,
      maxEvents: PAGE_SIZE,
      seenWindow: 200,
      idOf: (task) => `${task.id ?? ""}:${task.updated ?? ""}`,
      async fetchPage(pageToken) {
        const result = await listTasks.execute({
          taskList: params.taskList,
          updatedMin: new Date(cursor - OVERLAP_MS).toISOString(),
          maxResults: PAGE_SIZE,
          pageToken,
        }, ctx) as { items?: Array<{ id?: string }>; nextPageToken?: string };
        return { items: result.items ?? [], nextPageToken: result.nextPageToken };
      },
    });
    return { events, nextState: { ...nextState, cursor: now } as State };
  },
};

export default trigger;
