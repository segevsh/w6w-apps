import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

/**
 * `GET /v1/contacts` sorted by `createdAt` descending (https://developer.iclosed.io, OpenAPI
 * `Get Contacts`, verified 2026-11-10). No edited-contact sibling: the documented contact object
 * carries `createdAt` but no update stamp, and one is never invented.
 */
export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly created in iClosed.",
  action: contactList,
  input: () => ({ orderColumn: "createdAt", orderBy: "desc", limit: 100, page: 0 }),
  items: (result) => (result as { data?: { contacts?: unknown[] } }).data?.contacts ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "status", type: "string", label: "Status" },
    { key: "phoneNumber", type: "string", label: "Phone" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 9087,
    email: "ada@example.test",
    firstName: "Ada",
    lastName: "Lovelace",
    status: "POTENTIAL",
    phoneNumber: "+15550100",
    createdAt: "2026-11-10T09:30:00.000Z",
  },
});
