import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/box-list.ts";

// Streak documents `sortBy` as "creationTimestamp | lastUpdatedTimestamp. Both are in descending
// order." (https://streak.readme.io/reference/list-all-boxes-in-pipeline, verified 2026-11-09).
export default pollFromListAction<{ pipelineKey: string }>({
  key: "new-box",
  title: "New Box",
  description: "The run gets each newly created box in the selected pipeline.",
  action: action as unknown as ActionDefinition,
  input: ({ pipelineKey }) => ({ pipelineKey, sortBy: "creationTimestamp", page: 0, limit: 100 }),
  params: (action.params ?? []).filter((p) => p.key === "pipelineKey"),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { key?: unknown }).key ?? ""),
  output: [
    { key: "key", type: "string", label: "Box key" },
    { key: "name", type: "string", label: "Name" },
    { key: "pipelineKey", type: "string", label: "Pipeline key" },
    { key: "stageKey", type: "string", label: "Stage key" },
    { key: "creationTimestamp", type: "number", label: "Created (unix ms)" },
  ],
  sample: {
    key: "box_101",
    name: "Acme deal",
    pipelineKey: "pipe_1",
    stageKey: "5001",
    creationTimestamp: 1762646400000,
  },
  maxPages: 1,
});
