import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

// Contacts list: `order=desc` sorts by creation date, newest first
// (https://developer.aircall.io/api-references/ "List all Contacts", verified 2026-11-10).
// `contact-search` returns the same Contacts filtered by phone/email, so it is `covers` here.
export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created shared Contact.",
  action,
  input: () => ({ order: "desc", page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "phone_numbers", type: "array", label: "Phone numbers" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "created_at", type: "number", label: "Created at (UNIX seconds)" },
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
