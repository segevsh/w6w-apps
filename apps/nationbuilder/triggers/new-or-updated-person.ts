import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/person-list.ts";

type Person = { id?: unknown; updated_at?: unknown };

export default pollFromListAction({
  key: "new-or-updated-person",
  title: "New or Updated Person",
  description: "The run gets each person created or edited since the last check.",
  action,
  input: () => ({ sort: "-updated_at", pageSize: 100, pageNumber: 1 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => `${String((x as Person).id ?? "")}:${String((x as Person).updated_at ?? "")}`,
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "101",
    type: "signups",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.org",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T11:30:00Z",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
