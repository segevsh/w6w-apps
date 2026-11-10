import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/pipeline-list.ts";

// Streak documents `sortBy` as "What order to sort the pipelines by. There are two valid sorts:
// creationTimestamp and lastUpdatedTimestamp. Both are in descending order."
// (https://streak.readme.io/reference/list-all-pipelines, verified 2026-11-10; brief 9.1 a, second trigger 9.2).
// `GET /pipelines` is unpaged, so one request returns every pipeline, newest first.
export default pollFromListAction({
  key: "new-or-updated-pipeline",
  title: "New or Updated Pipeline",
  description: "The run gets each pipeline that is new or was just edited.",
  action: action as unknown as ActionDefinition,
  input: () => ({ sortBy: "lastUpdatedTimestamp" }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    `${(item as { key?: unknown }).key ?? ""}:${
      (item as { lastUpdatedTimestamp?: unknown }).lastUpdatedTimestamp ?? ""
    }`,
  output: [
    { key: "key", type: "string", label: "Pipeline key" },
    { key: "name", type: "string", label: "Name" },
    { key: "creationTimestamp", type: "number", label: "Created (unix ms)" },
    { key: "lastUpdatedTimestamp", type: "number", label: "Last updated (unix ms)" },
  ],
  sample: {
    key: "pipe_1",
    name: "Sales",
    creationTimestamp: 1762646400000,
    lastUpdatedTimestamp: 1762732800000,
  },
  maxPages: 1,
});
