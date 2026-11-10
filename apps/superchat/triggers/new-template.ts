import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/template-list.ts";

export default snapshotTrigger({
  key: "new-template",
  title: "New Template",
  description: "The run gets each newly created Superchat message template.",
  action: action as unknown as ActionDefinition,
  output: [{ key: "id", type: "string", label: "Template ID" }],
  sample: { id: "template_1" },
});
