import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/box-list.ts";

export default pollFromListAction<{ pipelineKey: string }>({
  key: "new-box",
  title: "New Box",
  description: "The run gets each newly created box in the selected pipeline.",
  action: action as unknown as ActionDefinition,
  input: ({ pipelineKey }) => ({ pipelineKey, sortBy: "creationTimestamp", page: 0, limit: 100 }),
  params: (action.params ?? []).filter((p) => p.key === "pipelineKey"),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { key?: unknown }).key ?? (item as { id?: unknown }).id ?? ""),
  output: [{ key: "key", type: "string", label: "Box key" }],
  sample: { key: "box_101", creationTimestamp: 1762646400000 },
  maxPages: 1,
});
