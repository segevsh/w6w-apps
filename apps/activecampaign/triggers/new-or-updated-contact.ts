import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

/**
 * `list-contacts`: `GET /contacts?orders[udate]=DESC&limit=20` — ActiveCampaign documents `orders[udate]`
 * (https://developers.activecampaign.com/reference/list-all-contacts, verified 2026-11-10), so page 1 is the newest created or changed contacts (imports included, which the subscribe webhook skips).
 */
export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact created or changed in ActiveCampaign, including contacts added by an import. An edit emits the contact again.",
  action: listContacts,
  input: () => ({ orderBy: "udate", orderDirection: "DESC", limit: 20 }),
  items: (r) => ((r as { contacts?: unknown[] }).contacts) ?? [],
  idOf: (item) => `${(item as { id: string }).id}:${(item as { udate?: string }).udate ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First Name" },
    { key: "lastName", type: "string", label: "Last Name" },
    { key: "cdate", type: "string", label: "Created" },
    { key: "udate", type: "string", label: "Updated" },
  ],
  sample: {
    id: "42",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    cdate: "2026-11-10T09:00:00-06:00",
    udate: "2026-11-10T10:00:00-06:00",
  },
});
