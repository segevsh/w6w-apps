import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/contact-lists-list.ts";

export default snapshotTrigger({
  key: "new-contact-list",
  title: "New Contact List",
  description: "The run gets each newly created Superchat contact list.",
  action: action as unknown as ActionDefinition,
  output: [{ key: "id", type: "string", label: "Contact list ID" }],
  sample: { id: "list_1" },
});
