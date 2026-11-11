import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/conversation-list.ts";

export default snapshotTrigger({
  key: "new-conversation",
  title: "New Conversation",
  description:
    "The run gets each conversation newly added to the Superchat workspace (the whole list is compared on every check, up to 5000).",
  action: action as unknown as ActionDefinition,
  output: [{ key: "id", type: "string", label: "Conversation ID" }],
  sample: { id: "conversation_1" },
});
