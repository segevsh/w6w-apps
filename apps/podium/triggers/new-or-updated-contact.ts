import contactList from "../actions/contact-list.ts";
import { updatedSinceTrigger } from "../lib/triggers.ts";

/** The run gets each contact that is new or was updated (`GET /v4/contacts` with `updated_at` = the last check minus a 2-minute overlap; an edit is a new event). Brief 9.1 (b), 9.2, 9.8, 9.9. */
export default updatedSinceTrigger({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact that is new or was updated (`GET /v4/contacts` with `updated_at` = the last check minus a 2-minute overlap; an edit is a new event).",
  action: contactList,
  sinceKey: "updatedAfter",
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    uid: "contact_1",
    name: "Pat Example",
    createdAt: "2026-11-10T11:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
});
