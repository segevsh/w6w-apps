import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/inbox-list.ts";

export default snapshotTrigger({
  key: "new-inbox",
  title: "New Inbox",
  description: "The run gets each newly created Superchat inbox.",
  action: action as unknown as ActionDefinition,
  output: [{ key: "id", type: "string", label: "Inbox ID" }],
  sample: { id: "inbox_1" },
});
