import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Givebutter contact, oldest first.",
  action: contactList as unknown as ActionDefinition,
  input: () => ({ sortByDesc: "created_at", page: 1, per_page: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "");
  },
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "primary_email", type: "string", label: "Primary email" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 3301,
    first_name: "Ada",
    last_name: "Lovelace",
    primary_email: "ada@example.test",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
