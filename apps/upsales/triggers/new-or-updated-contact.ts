import contactList from "../actions/contact-list.ts";
import { updatedListTrigger } from "../lib/list-trigger.ts";
export default updatedListTrigger({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  noun: "contact",
  action: contactList,
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "modDate", type: "string", label: "Modified at" },
  ],
  sample: { id: 1, modDate: "2026-11-10T00:00:00Z" },
});
