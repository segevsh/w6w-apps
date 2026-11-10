import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/person-list.ts";

const output = [
  { key: "id", type: "string" as const, label: "Person ID" },
  { key: "first_name", type: "string" as const, label: "First name" },
  { key: "last_name", type: "string" as const, label: "Last name" },
  { key: "email", type: "string" as const, label: "Email" },
  { key: "created_at", type: "string" as const, label: "Created at" },
  { key: "updated_at", type: "string" as const, label: "Updated at" },
];

const sample = {
  id: "101",
  type: "signups",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.org",
  created_at: "2026-11-09T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
};

const items = (r: unknown) => (r as { items?: unknown[] }).items ?? [];
const idOf = (x: unknown) => String((x as { id?: unknown }).id ?? "");

export default pollFromListAction({
  key: "new-person",
  title: "New Person",
  description: "The run gets each newly created person (NationBuilder signup).",
  action,
  input: () => ({ sort: "-created_at", pageSize: 100, pageNumber: 1 }),
  items,
  idOf,
  output,
  sample,
  minIntervalMs: 300_000,
  maxPages: 1,
});
