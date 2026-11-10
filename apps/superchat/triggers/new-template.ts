import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/template-list.ts";

export default pollFromListAction<Record<string, never>>({
  key: "new-template",
  title: "New Template",
  description: "The run gets each newly created Superchat message template.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Template ID" }],
  sample: { id: "template_1" },
  maxPages: 1,
});
