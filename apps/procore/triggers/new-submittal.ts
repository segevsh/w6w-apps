import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/submittal-list.ts";

export default pollFromListAction({
  key: "new-submittal",
  title: "New Submittal",
  description: "The run gets each newly created submittal.",
  action: action as unknown as ActionDefinition,
  input: () => ({ projectId: 1, perPage: 100, page: 1, sort: "created_at" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Submittal ID" }],
  sample: { id: 2 },
  maxPages: 1,
});
