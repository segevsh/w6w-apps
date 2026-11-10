import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

// `order_by=updated_at` with `order=desc` lists the most recently changed Contacts first
// (https://developer.aircall.io/api-references/ "List all Contacts", verified 2026-11-10).
// The id carries the update stamp, so an edit to a known Contact is a new event.
export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each Contact that is newly created or has been edited.",
  action,
  input: () => ({ orderBy: "updated_at", order: "desc", page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const contact = item as { id?: unknown; updated_at?: unknown };
    return `${String(contact.id ?? "")}:${String(contact.updated_at ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "phone_numbers", type: "array", label: "Phone numbers" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "updated_at", type: "number", label: "Updated at (UNIX seconds)" },
  ],
  sample: {
    id: 710,
    first_name: "Vicente",
    last_name: "Abad",
    company_name: null,
    created_at: 1400691054,
    updated_at: 1444336506,
    emails: [],
    phone_numbers: [{ id: 3367, label: "Mobile", value: "+34664673697" }],
  },
  maxPages: 1,
});
