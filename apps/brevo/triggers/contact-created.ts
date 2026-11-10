import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

/**
 * `GET /contacts?limit=100&offset=0&sort=desc`: Brevo sorts "in the ascending/descending order of
 * record creation", descending by default (https://developers.brevo.com/reference/get-contacts,
 * read 2026-11-10), so page 1 is the newest contacts.
 */
export default pollFromListAction({
  key: "contact-created",
  title: "Contact Created",
  description:
    "The run gets each contact newly created in the Brevo account (any list or none). New contact on a list is the New Contact webhook.",
  action: listContacts,
  input: () => ({ limit: 100, offset: 0, sort: "desc" }),
  items: (result) => {
    const contacts = (result as { contacts?: unknown })?.contacts;
    return Array.isArray(contacts) ? contacts : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "emailBlacklisted", type: "boolean", label: "Email blacklisted" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "modifiedAt", type: "string", label: "Modified at" },
    { key: "listIds", type: "array", label: "List IDs" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],
  sample: {
    id: 42,
    email: "ada@example.com",
    emailBlacklisted: false,
    createdAt: "2026-11-10T09:00:00.000+01:00",
    modifiedAt: "2026-11-10T09:00:00.000+01:00",
    listIds: [8],
    attributes: { FIRSTNAME: "Ada" },
  },
  maxPages: 1,
});
