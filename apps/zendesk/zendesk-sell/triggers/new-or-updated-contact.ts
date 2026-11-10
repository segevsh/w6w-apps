import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

interface Contact {
  id?: number;
  updated_at?: string;
}

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each contact that is created or edited, most recently changed first.",
  action,
  input: () => ({ page: 1, perPage: 100, sortBy: "updated_at:desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const c = item as Contact;
    return `${c.id ?? ""}:${c.updated_at ?? ""}`;
  },
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 101,
    name: "Mark Johnson",
    email: "mark@example.com",
    created_at: "2026-11-01T09:00:00Z",
    updated_at: "2026-11-09T12:00:00Z",
  },
});
