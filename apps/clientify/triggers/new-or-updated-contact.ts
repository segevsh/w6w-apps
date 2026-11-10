import { clientifyPoll } from "../lib/triggers.ts";
import contactList from "../actions/contact-list.ts";

export default clientifyPoll({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each contact that is created or edited, once per edit.",
  action: contactList,
  field: "modified",
  withStamp: true,
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "modified", type: "string", label: "Last modified" },
  ],
  sample: { id: 501, created: "2026-11-09T09:00:00Z", modified: "2026-11-09T09:30:00Z" },
});
