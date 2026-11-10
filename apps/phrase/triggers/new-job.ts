import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/job-list.ts";

export default pollFromListAction({
  key: "new-job",
  title: "New Job",
  description: "The run gets each newly created job.",
  action: action as unknown as ActionDefinition,
  input: () => ({ projectId: "project-1", page: 1, perPage: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Job ID" }],
  sample: { id: "job-2" },
  maxPages: 1,
});
