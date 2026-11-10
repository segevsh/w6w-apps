import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import tasksList from "../actions/tasks-list.ts";

const trigger: TriggerDefinition = {
  key: "new-task",
  title: "New Task",
  description: "The run gets open tasks added to Bob's 5,000-task bounded response.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Task ID" },
    { key: "values", type: "object", label: "Task" },
  ],
  sample: { change: "added", key: "1", values: { id: 1, title: "Sign contract" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await tasksList.execute({}, ctx) as { tasks?: unknown[] };
    const tasks = Array.isArray(result.tasks) ? result.tasks : [];
    return await pollSnapshot({
      state,
      rows: tasks.map((task) => ({
        key: String((task as { id?: unknown }).id ?? ""),
        values: task,
      })),
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
