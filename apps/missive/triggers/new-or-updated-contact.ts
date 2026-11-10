import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each newly created or modified Missive contact.",
  action: contactList as unknown as ActionDefinition,
  input: (params: { contactBook: string }) => ({
    ...params,
    order: "last_modified",
    limit: 200,
    offset: 0,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => {
    const contact = item as { id?: unknown; modified_at?: unknown };
    return `${String(contact.id ?? "")}:${String(contact.modified_at ?? "")}`;
  },
  params: [{ key: "contactBook", label: "Contact Book ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact-new", modified_at: 1794225600 },
  maxPages: 1,
});
