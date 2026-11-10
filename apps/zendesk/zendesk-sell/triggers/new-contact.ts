import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact (people and organizations), newest first.",
  action,
  input: () => ({ page: 1, perPage: 100, sortBy: "created_at:desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "is_organization", type: "boolean", label: "Is an organization" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 101,
    name: "Mark Johnson",
    email: "mark@example.com",
    is_organization: false,
    created_at: "2026-11-09T12:00:00Z",
  },
});
