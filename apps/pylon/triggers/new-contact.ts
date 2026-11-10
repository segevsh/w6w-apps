import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";
import { idField, SNAPSHOT_PAGE_SIZE, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /contacts` documents cursor paging and no order or time filter, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created customer contact.",
  action: contactList as unknown as ActionDefinition,
  paged: true,
  input: () => ({ limit: SNAPSHOT_PAGE_SIZE }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "con_1", name: "Ada Customer", email: "ada@acme.example" },
});
