import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-contacts.ts";
import { FIELDS } from "./new-contact.ts";

type Row = { id?: unknown; write_date?: unknown };

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each contact or company created or edited since the last check.",
  action,
  input: () => ({ order: "write_date desc", fields: FIELDS, limit: 100, offset: 0 }),
  items: (r) => (r as { records?: unknown[] }).records ?? [],
  idOf: (x) => `${String((x as Row).id ?? "")}:${String((x as Row).write_date ?? "")}`,
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "is_company", type: "boolean", label: "Is a company" },
    { key: "create_date", type: "string", label: "Created at (UTC)" },
    { key: "write_date", type: "string", label: "Last updated (UTC)" },
  ],
  sample: {
    id: 42,
    name: "Acme Corporation",
    email: "info@acme.example",
    phone: false,
    is_company: true,
    create_date: "2026-11-09 10:00:00",
    write_date: "2026-11-09 11:30:00",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
