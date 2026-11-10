import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/contact-contact-lists-list.ts";

export default snapshotTrigger({
  key: "new-contact-list-membership",
  title: "New Contact List Membership",
  description: "The run gets each list a selected contact is newly added to.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ contactId: params.contactId }),
  params: [{ key: "contactId", label: "Contact ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Contact list ID" }],
  sample: { id: "list_1" },
});
