import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listFlows from "../actions/list-flows.ts";

export default pollFromListAction({
  key: "new-flow",
  title: "New Flow",
  description: "The run gets each newly created flow.",
  action: listFlows as ActionDefinition,
  input: (_params) => ({}),
  items: (r) => (r as { data?: { flows?: unknown[] } }).data?.flows ?? [],
  idOf: (item) => String((item as { ns?: unknown }).ns ?? ""),

  output: [{ key: "id", type: "string", label: "New Flow ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
