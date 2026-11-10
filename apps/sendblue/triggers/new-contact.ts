import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

/**
 * `GET /api/v2/contacts` sorts by `order_by` (default `created_at`) and `order_direction`
 * (default `desc`), returns a bare array, and a contact is addressed by its phone number
 * (https://docs.sendblue.com/api-v2/contacts, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to your Sendblue account.",
  action: contactList,
  input: () => ({ orderBy: "created_at", orderDirection: "desc", limit: 100, offset: 0 }),
  items: (result) => (Array.isArray(result) ? result : []),
  idOf: (item) => String((item as { phone: string }).phone),
  output: [
    { key: "phone", type: "string", label: "Phone number" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "sendblueNumber", type: "string", label: "Sendblue number" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    firstName: "John",
    lastName: "Doe",
    phone: "+14155551234",
    sendblueNumber: "+19175559876",
    tags: ["VIP"],
    created_at: "2024-01-15T10:30:00Z",
  },
  maxPages: 1,
});
