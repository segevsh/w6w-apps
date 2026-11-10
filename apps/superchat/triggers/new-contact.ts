import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/contact-list.ts";

// Superchat: "Lists all contacts in workspace … Objects are sorted descendingly by their created_at
// value." (https://developers.superchat.com/reference/get_contacts, verified 2026-11-09).
export default pollFromListAction<Record<string, never>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact in the workspace.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "ct_101",
    first_name: "Ada",
    last_name: "Lovelace",
    created_at: "2026-11-09T00:00:00Z",
  },
  maxPages: 1,
});
