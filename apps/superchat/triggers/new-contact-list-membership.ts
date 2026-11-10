import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-contact-lists-list.ts";

export default pollFromListAction<{ contactId: string }>({
  key: "new-contact-list-membership",
  title: "New Contact List Membership",
  description: "The run gets each contact-list membership for the selected contact.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ contactId: params.contactId, limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "contactId", label: "Contact ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Contact list ID" }],
  sample: { id: "list_1" },
  maxPages: 1,
});
