import { clientifyPoll } from "../lib/triggers.ts";
import contactList from "../actions/contact-list.ts";

export default clientifyPoll({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: contactList,
  field: "created",
  withStamp: false,
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "modified", type: "string", label: "Last modified" },
  ],
  sample: { id: 501, created: "2026-11-09T09:00:00Z", modified: "2026-11-09T09:30:00Z" },
});
